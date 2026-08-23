<script lang="ts">
  import { onMount } from "svelte";
  import { derived } from "svelte/store";
  import { appConfig, connectionState, printerClient, printerMeta, refreshRfidInfo } from "$/stores";
  import * as effects from "$/utils/post_process";
  import {
    type EncodedImage,
    ImageEncoder,
    LabelType,
    printTaskNames,
    type PrintProgressEvent,
    type PrintTaskName,
    AbstractPrintTask,
    Utils,
  } from "@mmote/niimbluelib";
  import type { LabelProps, PostProcessType, FabricJson, PreviewProps, PreviewPropsOffset } from "$/types";
  import ParamLockButton from "$/components/basic/ParamLockButton.svelte";
  import { tr, type TranslationKey } from "$/utils/i18n";
  import { canvasPreprocess } from "$/utils/canvas_preprocess";
  import { type DSVRowArray, csvParse } from "d3-dsv";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Toasts } from "$/utils/toasts";
  import { CustomCanvas } from "$/fabric-object/custom_canvas";
  import { FileUtils } from "$/utils/file_utils";
  import AlertCircleIcon from "@lucide/svelte/icons/alert-circle";
  import ChevronLeftIcon from "@lucide/svelte/icons/chevron-left";
  import ChevronRightIcon from "@lucide/svelte/icons/chevron-right";
  import FlipHorizontal2Icon from "@lucide/svelte/icons/flip-horizontal-2";
  import InvertIcon from "@lucide/svelte/icons/contrast";
  import PrinterIcon from "@lucide/svelte/icons/printer";
  import SlidersHorizontalIcon from "@lucide/svelte/icons/sliders-horizontal";
  import * as Alert from "$/components/ui/alert/index.js";
  import { Button } from "$/components/ui/button/index.js";
  import * as Dialog from "$/components/ui/dialog/index.js";
  import { Progress } from "$/components/ui/progress/index.js";
  import { Separator } from "$/components/ui/separator/index.js";

  interface Props {
    labelProps: LabelProps;
    canvasCallback: () => FabricJson;
    printNow?: boolean;
    csvData: string;
    csvEnabled: boolean;
    show: boolean;
  }

  let { labelProps, canvasCallback, printNow = false, csvData, csvEnabled, show = $bindable() }: Props = $props();

  let previewCanvas: HTMLCanvasElement;
  let printState = $state<"idle" | "sending" | "printing">("idle");
  let printProgress = $state<number>(0); // todo: more progress data
  let density = $state<number>($printerMeta?.densityDefault ?? 3);
  let speed = $state<0 | 1>(1);
  let quantity = $state<number>(1);
  let postProcessType = $state<PostProcessType>();
  let postProcessInvert = $state<boolean>(false);
  let postProcessMirror = $state<boolean>(false);
  let thresholdValue = $state<number>(140);
  let strengthValue = $state<number>(1);
  let serpentineValue = $state<boolean>(true);
  let originalImage: ImageData;
  let previewContext: CanvasRenderingContext2D;
  let printTaskName = $state<PrintTaskName>("B1");
  let labelType = $state<LabelType>(LabelType.WithGaps);
  // eslint-disable-next-line no-undef
  let statusTimer: NodeJS.Timeout | undefined = undefined;
  let error = $state<string>("");
  let detectedPrintTaskName: PrintTaskName | undefined = $printerClient?.getPrintTaskType();
  let csvParsed: DSVRowArray<string>;
  let page = $state<number>(0);
  let pagesTotal = $state<number>(1);
  let offset = $state<PreviewPropsOffset>({ x: 0, y: 0, offsetType: "inner" });
  let offsetWarning = $state<string>("");
  let currentPrintTask: AbstractPrintTask | undefined;

  let savedProps = $state<PreviewProps>({});

  const disconnected = derived(connectionState, ($connectionState) => $connectionState !== "connected");

  const labelTypeTranslationKey = (labelType: string): TranslationKey =>
    `preview.label_type.${labelType}` as TranslationKey;

  const endPrint = async () => {
    clearInterval(statusTimer);

    if (!$disconnected && printState !== "idle") {
      if (currentPrintTask !== undefined) {
        await currentPrintTask.printEnd();
      } else {
        console.warn("Print task undefined, falling back to PrintEnd command");
        await $printerClient.abstraction.printEnd();
      }

      refreshRfidInfo();

      $printerClient.startHeartbeat();
    }

    printState = "idle";
    printProgress = 0;
  };

  const onPrintOnSystemPrinter = async () => {
    const sources: string[] = [];

    for (let curPage = 0; curPage < pagesTotal; curPage++) {
      page = curPage;
      await generatePreviewData(page);
      sources.push(previewCanvas.toDataURL("image/png"));
    }

    FileUtils.printImageUrls(sources);
  };

  const onPrint = async () => {
    printState = "sending";
    error = "";

    // do it in a stupid way (multi-page print not finished yet)
    for (let curPage = 0; curPage < pagesTotal; curPage++) {
      $printerClient.stopHeartbeat();

      currentPrintTask = $printerClient.abstraction.newPrintTask(printTaskName, {
        totalPages: quantity,
        density,
        speed,
        labelType,
        statusPollIntervalMs: 100,
        statusTimeoutMs: 8_000,
      });

      page = curPage;
      console.log("Printing page", page);

      await generatePreviewData(page);

      try {
        const encoded: EncodedImage = ImageEncoder.encodeCanvas(previewCanvas, labelProps.printDirection);
        await currentPrintTask.printInit();
        await currentPrintTask.printPage(encoded, quantity);
      } catch (e) {
        error = `${e}`;
        console.error(e);
        return;
      }

      printState = "printing";

      const listener = (e: PrintProgressEvent) => {
        printProgress = Math.floor((e.page / quantity) * ((e.pagePrintProgress + e.pageFeedProgress) / 2));
      };

      $printerClient.on("printprogress", listener);

      try {
        await currentPrintTask.waitForFinished();
      } catch (e) {
        error = `${e}`;
        console.error(e);
      }

      $printerClient.off("printprogress", listener);

      await endPrint();

      if (
        $appConfig.pageDelay !== undefined &&
        $appConfig.pageDelay > 0 &&
        pagesTotal > 1 &&
        curPage < pagesTotal - 1
      ) {
        await Utils.sleep($appConfig.pageDelay);
      }
    }

    printState = "idle";
    $printerClient.startHeartbeat();

    if (printNow && !error) {
      show = false;
    }
  };

  const updatePreview = () => {
    let iData: ImageData = effects.copyImageData(originalImage);

    if (postProcessType === "threshold") {
      iData = effects.threshold(iData, thresholdValue);
    } else if (postProcessType === "dither") {
      iData = effects.atkinson(iData, { threshold: thresholdValue, strength: strengthValue, serpentine: serpentineValue });
    } else if (postProcessType === "bayer2") {
      iData = effects.bayer(iData, 2);
    } else if (postProcessType === "bayer4") {
      iData = effects.bayer(iData, 4);
    } else if (postProcessType === "bayer8") {
      iData = effects.bayer(iData, 8);
    } else if (postProcessType === "floyd_steinberg") {
      iData = effects.floydSteinberg(iData, { threshold: thresholdValue, strength: strengthValue, serpentine: serpentineValue });
    } else if (postProcessType === "jjn") {
      iData = effects.jarvisJudiceNinke(iData, { threshold: thresholdValue, strength: strengthValue, serpentine: serpentineValue });
    } else if (postProcessType === "stucki") {
      iData = effects.stucki(iData, { threshold: thresholdValue, strength: strengthValue, serpentine: serpentineValue });
    }

    if (postProcessInvert) {
      iData = effects.invert(iData);
    }

    if (postProcessMirror) {
      iData = effects.mirror(iData);
    }

    offsetWarning = "";

    if (offset.offsetType === "inner") {
      previewCanvas.width = originalImage.width;
      previewCanvas.height = originalImage.height;
      previewContext.fillStyle = "white";
      previewContext.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
      previewContext.putImageData(iData, offset.x, offset.y);
    } else {
      previewCanvas.width = originalImage.width + Math.abs(offset.x);
      previewCanvas.height = originalImage.height + Math.abs(offset.y);
      previewContext.fillStyle = "white";
      previewContext.fillRect(0, 0, previewCanvas.width, previewCanvas.height);
      previewContext.putImageData(iData, Math.max(offset.x, 0), Math.max(offset.y, 0));
    }

    if ($printerMeta !== undefined) {
      const headSize = labelProps.printDirection == "left" ? previewCanvas.height : previewCanvas.width;
      if (headSize > $printerMeta.printheadPixels) {
        offsetWarning += $tr("params.label.warning.width") + " ";
        offsetWarning += `(${headSize} > ${$printerMeta.printheadPixels})`;
        offsetWarning += "\n";
      }
    }
  };

  const toggleSavedProp = (key: string, value: any) => {
    const keyObj = key as keyof typeof savedProps;
    savedProps[keyObj] = savedProps[keyObj] === undefined ? value : undefined;
    try {
      LocalStoragePersistence.savePreviewProps(savedProps);
    } catch (e) {
      Toasts.zodErrors(e, "Preview parameters save error:");
    }
  };

  const updateSavedProp = (key: string, value: any, refreshPreview: boolean = false) => {
    const keyObj = key as keyof typeof savedProps;

    if (savedProps[keyObj] !== undefined) {
      savedProps[keyObj] = value;
      try {
        LocalStoragePersistence.savePreviewProps(savedProps);
      } catch (e) {
        Toasts.zodErrors(e, "Preview parameters save error:");
      }
    }

    if (refreshPreview) {
      updatePreview();
    }
  };

  const loadProps = () => {
    try {
      const saved = LocalStoragePersistence.loadSavedPreviewProps();
      if (saved === null) {
        return;
      }
      savedProps = saved;
      if (saved.postProcess !== undefined) postProcessType = saved.postProcess;
      if (saved.postProcessInvert !== undefined) postProcessInvert = saved.postProcessInvert;
      if (saved.threshold !== undefined) thresholdValue = saved.threshold;
      if (saved.strength !== undefined) strengthValue = saved.strength;
      if (saved.serpentine !== undefined) serpentineValue = saved.serpentine;
      if (saved.quantity !== undefined) quantity = saved.quantity;
      if (saved.density !== undefined) density = saved.density;
      if (saved.speed !== undefined) speed = saved.speed;
      if (saved.labelType !== undefined) labelType = saved.labelType;
      if (saved.printTaskName !== undefined) printTaskName = saved.printTaskName;
      if (saved.offset !== undefined) offset = saved.offset;
    } catch (e) {
      Toasts.zodErrors(e, "Preview parameters load error:");
    }
  };

  const pageDown = () => {
    if (!csvEnabled) {
      page = 0;
      return;
    }
    page = Math.max(0, Math.min(csvParsed.length - 1, page - 1));
    generatePreviewData(page);
  };

  const pageUp = () => {
    if (!csvEnabled) {
      page = 0;
      return;
    }
    page = Math.min(csvParsed.length - 1, page + 1);
    generatePreviewData(page);
  };

  const generatePreviewData = async (page: number): Promise<void> => {
    const fabricTempCanvas = new CustomCanvas(undefined, {
      width: labelProps.size.width,
      height: labelProps.size.height,
    });

    fabricTempCanvas.setCustomBackground(false);
    fabricTempCanvas.setHighlightMirror(false);

    fabricTempCanvas.setLabelProps(labelProps);

    await fabricTempCanvas.loadFromJSON(canvasCallback());

    let variables = {};

    if (csvEnabled) {
      if (page >= 0 && page < csvParsed.length) {
        variables = csvParsed[page];
      } else {
        console.warn(`Page ${page} is out of csv bounds (csv length is ${csvParsed.length})`);
      }
    }

    console.log("Page variables:", variables);

    canvasPreprocess(fabricTempCanvas, variables);

    await fabricTempCanvas.createMirroredObjects();

    fabricTempCanvas.requestRenderAll();

    const preRenderedCanvas = fabricTempCanvas.toCanvasElement();
    const ctx = preRenderedCanvas.getContext("2d")!;
    previewCanvas.width = preRenderedCanvas.width;
    previewCanvas.height = preRenderedCanvas.height;
    previewContext = previewCanvas.getContext("2d")!;
    originalImage = ctx.getImageData(0, 0, preRenderedCanvas.width, preRenderedCanvas.height);

    updatePreview();

    fabricTempCanvas.dispose();
  };

  const onModalClose = () => {
    endPrint();
  };

  onMount(async () => {
    if (csvEnabled) {
      const parseResult = csvParse(csvData);
      const spread: DSVRowArray<string> = Object.assign([], { columns: parseResult.columns });

      for (let row of parseResult) {
        for (const k of Object.keys(row)) {
          row[k] = row[k].replaceAll("\\n", "\n");
        }

        let times = 1;

        if ("$times" in row && row["$times"] !== "") {
          try {
            times = parseInt(row["$times"]);
          } catch (e) {
            console.warn("$times parse error", e);
          }
        }

        if (times < 0) {
          times = 0;
        }

        for (let i = 0; i < times; i++) {
          spread.push(row);
        }
      }

      csvParsed = spread;
      pagesTotal = csvParsed.length;
    }

    if (detectedPrintTaskName !== undefined) {
      console.log(`Detected print task version: ${detectedPrintTaskName}`);
      printTaskName = detectedPrintTaskName;
    }

    loadProps();

    await generatePreviewData(page);

    if (printNow && !$disconnected && printState === "idle") {
      onPrint();
    }
  });
</script>

<Dialog.Root bind:open={show} onOpenChange={(open) => { if (!open) onModalClose(); }}>
  <Dialog.Content class="print-dialog" showCloseButton={printState === "idle"}>
    <Dialog.Header class="print-dialog-header">
      <div class="dialog-title-row">
        <div class="dialog-icon"><SlidersHorizontalIcon /></div>
        <div>
          <Dialog.Title>{$tr("preview.title")}</Dialog.Title>
          <Dialog.Description>{$tr("preview.description")}</Dialog.Description>
        </div>
      </div>
    </Dialog.Header>

    <div class="preview-layout">
      <section class="preview-stage studio-grid">
        <div class="preview-canvas-row">
          {#if pagesTotal > 1}
            <Button disabled={printState !== "idle"} variant="ghost" size="icon" onclick={pageDown} aria-label={$tr("preview.previous_page")}>
              <ChevronLeftIcon />
            </Button>
          {/if}

          <div class="preview-paper">
            <canvas class="print-start-{labelProps.printDirection}" bind:this={previewCanvas}></canvas>
          </div>

          {#if pagesTotal > 1}
            <Button disabled={printState !== "idle"} variant="ghost" size="icon" onclick={pageUp} aria-label={$tr("preview.next_page")}>
              <ChevronRightIcon />
            </Button>
          {/if}
        </div>

        <div class="preview-meta">
          <span class="metric">{labelProps.size.width} × {labelProps.size.height} PX</span>
          {#if pagesTotal > 1}<span class="page-count">{page + 1} / {pagesTotal}</span>{/if}
        </div>

        {#if printState !== "idle"}
          <div class="print-status" aria-live="polite">
            <div><span>{printState === "sending" ? $tr("preview.sending") : $tr("preview.printing")}</span><strong>{printProgress}%</strong></div>
            <Progress value={printProgress} />
          </div>
        {/if}

        {#if error}
          <Alert.Root variant="destructive">
            <AlertCircleIcon />
            <Alert.Title>{$tr("preview.error")}</Alert.Title>
            <Alert.Description>{error}</Alert.Description>
          </Alert.Root>
        {/if}
      </section>

      <aside class="preview-settings">
        <div class="settings-heading">
          <span>{$tr("preview.settings")}</span>
          <span class="metric">{$tr("preview.live")}</span>
        </div>
        <Separator />
    <div class="input-group input-group-sm">
      <span class="input-group-text">{$tr("preview.postprocess")}</span>

      <select
        class="form-select"
        bind:value={postProcessType}
        onchange={() => updateSavedProp("postProcess", postProcessType, true)}>
        <option value="threshold">{$tr("preview.postprocess.threshold")}</option>
        <option value="dither">{$tr("preview.postprocess.atkinson")}</option>
        <option value="bayer2">{$tr("preview.postprocess.bayer")} 2x2</option>
        <option value="bayer4">{$tr("preview.postprocess.bayer")} 4x4</option>
        <option value="bayer8">{$tr("preview.postprocess.bayer")} 8x8</option>
        <option value="floyd_steinberg">{$tr("preview.postprocess.floyd_steinberg")}</option>
        <option value="jjn">{$tr("preview.postprocess.jjn")}</option>
        <option value="stucki">{$tr("preview.postprocess.stucki")}</option>
      </select>

      <ParamLockButton
        propName="postProcess"
        value={postProcessType}
        savedValue={savedProps.postProcess}
        onClick={toggleSavedProp} />

      <Button
        variant={postProcessInvert ? "secondary" : "outline"}
        size="icon-sm"
        aria-label={$tr("preview.invert")}
        onclick={() => {
          postProcessInvert = !postProcessInvert;
          updatePreview();
        }}>
        <InvertIcon />
      </Button>

      <Button
        variant={postProcessMirror ? "secondary" : "outline"}
        size="icon-sm"
        aria-label={$tr("preview.mirror")}
        onclick={() => {
          postProcessMirror = !postProcessMirror;
          updatePreview();
        }}>
        <FlipHorizontal2Icon />
      </Button>
    </div>

    {#if !(postProcessType && ["bayer2", "bayer4", "bayer8"].includes(postProcessType))}
      <div class="input-group input-group-sm">
        <span class="input-group-text">{$tr("preview.threshold")}</span>

        <input
          type="range"
          id="threshold"
          class="form-range"
          min="1"
          max="255"
          bind:value={thresholdValue}
          onchange={() => updateSavedProp("threshold", thresholdValue, true)} />
        <span class="input-group-text">{thresholdValue}</span>

        <ParamLockButton
          propName="threshold"
          value={thresholdValue}
          savedValue={savedProps.threshold}
          onClick={toggleSavedProp} />
      </div>
    {/if}

    {#if postProcessType === "floyd_steinberg" || postProcessType === "jjn" || postProcessType === "stucki" || postProcessType === "dither"}
      <div class="input-group input-group-sm">
        <span class="input-group-text">{$tr("preview.strength")}</span>

        <input
          type="range"
          id="strength"
          class="form-range"
          min="0"
          max="1.5"
          step="0.1"
          bind:value={strengthValue}
          onchange={() => updateSavedProp("strength", strengthValue, true)} />
        <span class="input-group-text">{strengthValue.toFixed(1)}</span>

        <ParamLockButton
          propName="strength"
          value={strengthValue}
          savedValue={savedProps.strength}
          onClick={toggleSavedProp} />

        <button
          class="btn btn-sm {serpentineValue ? 'btn-secondary' : 'btn-outline-secondary'}"
          title={$tr("preview.serpentine")}
          onclick={() => {
            serpentineValue = !serpentineValue;
            updateSavedProp("serpentine", serpentineValue, true);
          }}>
          <MdIcon icon="swap_vert" />
        </button>

      </div>
    {/if}

    <div class="input-group flex-nowrap input-group-sm">
      <span class="input-group-text">{$tr("preview.copies")}</span>
      <input
        class="form-control"
        type="number"
        min="1"
        bind:value={quantity}
        onchange={() => updateSavedProp("quantity", quantity)} />
      <ParamLockButton
        propName="quantity"
        value={quantity}
        savedValue={savedProps.quantity}
        onClick={toggleSavedProp} />
    </div>

    <div class="input-group flex-nowrap input-group-sm">
      <span class="input-group-text">{$tr("preview.density")}</span>
      <input
        class="form-control"
        type="number"
        min={$printerMeta?.densityMin ?? 1}
        max={$printerMeta?.densityMax ?? 20}
        bind:value={density}
        onchange={() => updateSavedProp("density", density)} />
      <ParamLockButton propName="density" value={density} savedValue={savedProps.density} onClick={toggleSavedProp} />
    </div>

    {#if printTaskName === "D110M_V4"}
      <div class="input-group flex-nowrap input-group-sm">
        <span class="input-group-text">{$tr("preview.speed")}</span>
        <select class="form-select" bind:value={speed} onchange={() => updateSavedProp("speed", speed, true)}>
          <option value={0}>{$tr("preview.speed.0")}</option>
          <option value={1}>{$tr("preview.speed.1")}</option>
        </select>

        <ParamLockButton propName="speed" value={speed} savedValue={savedProps.speed} onClick={toggleSavedProp} />
      </div>
    {/if}

    <div class="input-group input-group-sm">
      <span class="input-group-text">{$tr("preview.label_type")}</span>
      <select class="form-select" bind:value={labelType} onchange={() => updateSavedProp("labelType", labelType)}>
        {#each Object.values(LabelType) as lt (lt)}
          {#if typeof lt !== "string"}
            <option value={lt}>
              {#if $printerMeta?.paperTypes.includes(lt)}✔{/if}
              {$tr(labelTypeTranslationKey(LabelType[lt]))}
            </option>
          {/if}
        {/each}
      </select>

      <ParamLockButton
        propName="labelType"
        value={labelType}
        savedValue={savedProps.labelType}
        onClick={toggleSavedProp} />
    </div>

    <div class="input-group input-group-sm">
      <span class="input-group-text">{$tr("preview.print_task")}</span>
      <select
        class="form-select"
        bind:value={printTaskName}
        onchange={() => updateSavedProp("printTaskName", printTaskName)}>
        {#each printTaskNames as name (name)}
          <option value={name}>
            {#if detectedPrintTaskName === name}✔{/if}
            {name}
          </option>
        {/each}
      </select>

      <ParamLockButton
        propName="printTaskName"
        value={printTaskName}
        savedValue={savedProps.printTaskName}
        onClick={toggleSavedProp} />
    </div>

    <div class="input-group input-group-sm">
      <span class="input-group-text">{$tr("preview.offset")}</span>
      {#if offsetWarning}
        <span class="input-group-text text-warning" title={offsetWarning}><MdIcon icon="warning" /></span>
      {/if}
      <span class="input-group-text"><MdIcon icon="unfold_more" class="r-90" /></span>
      <input
        class="form-control"
        type="number"
        bind:value={offset.x}
        onchange={() => updateSavedProp("offset", offset, true)} />
      <span class="input-group-text"><MdIcon icon="unfold_more" /></span>
      <input
        class="form-control"
        type="number"
        bind:value={offset.y}
        onchange={() => updateSavedProp("offset", offset, true)} />
      <select
        class="form-select"
        bind:value={offset.offsetType}
        onchange={() => updateSavedProp("offset", offset, true)}>
        <option value="inner">{$tr("preview.offset.inner")}</option>
        <option value="outer">{$tr("preview.offset.outer")}</option>
      </select>

      <ParamLockButton propName="offset" value={offset} savedValue={savedProps.offset} onClick={toggleSavedProp} />
    </div>

    <Separator class="my-1" />
    <div class="preview-actions">
      <Button type="button" variant="ghost" onclick={() => (show = false)}>{$tr("preview.close")}</Button>

    {#if printState !== "idle"}
      <Button type="button" variant="destructive" disabled={$disconnected} onclick={endPrint}>
        {$tr("preview.print.cancel")}
      </Button>
    {/if}

    <Button
      type="button"
      variant="outline"
      size="icon"
      title={$tr("preview.print.system")}
      aria-label={$tr("preview.print.system")}
      onclick={onPrintOnSystemPrinter}>
      <PrinterIcon />
    </Button>

    <Button type="button" disabled={$disconnected || printState !== "idle"} onclick={onPrint}>
      {#if $disconnected}
        {$tr("preview.not_connected")}
      {:else}
        <PrinterIcon data-icon="inline-start" /> {$tr("preview.print")}
      {/if}
    </Button>
    </div>
      </aside>
    </div>
  </Dialog.Content>
</Dialog.Root>

<style>
  :global(.print-dialog) {
    width: min(96vw, 76rem);
    max-width: min(96vw, 76rem) !important;
    height: min(90dvh, 52rem);
    grid-template-rows: auto minmax(0, 1fr);
    gap: 0;
    padding: 0;
    overflow: hidden;
    background: color-mix(in oklch, var(--popover) 96%, transparent);
    box-shadow: 0 2rem 7rem rgb(0 0 0 / 0.55);
  }

  :global(.print-dialog-header) { padding: 1rem 1.1rem 0.85rem; border-bottom: 1px solid var(--border); }
  .dialog-title-row { display: flex; align-items: center; gap: 0.7rem; }
  .dialog-icon { width: 2rem; height: 2rem; display: grid; place-items: center; border-radius: var(--radius-md); background: color-mix(in oklch, var(--primary) 15%, transparent); color: var(--primary); }
  .dialog-icon :global(svg) { width: 1rem; }
  .preview-layout { min-width: 0; min-height: 0; display: grid; grid-template-columns: minmax(0, 1fr) 22rem; }
  .preview-stage { min-width: 0; min-height: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 1rem; padding: clamp(1rem, 4vw, 3rem); overflow: auto; background-color: color-mix(in oklch, var(--background) 78%, black); }
  .preview-canvas-row { width: 100%; display: flex; align-items: center; justify-content: center; gap: 0.75rem; }
  .preview-paper { max-width: 100%; max-height: 62vh; overflow: auto; border-radius: 0.3rem; background: var(--paper); box-shadow: 0 2rem 5rem rgb(0 0 0 / 0.48); }
  canvas {
    image-rendering: pixelated;
    display: block;
    border: 1px solid color-mix(in oklch, var(--paper-foreground) 18%, transparent);
    max-width: 100%;
  }
  canvas.print-start-left { border-left: 3px solid var(--primary); }
  canvas.print-start-top { border-top: 3px solid var(--primary); }
  .preview-meta { display: flex; align-items: center; gap: 0.75rem; }
  .page-count { min-width: 2.5rem; padding: 0.2rem 0.45rem; border-radius: 999px; background: var(--muted); font: 600 0.65rem/1 var(--font-mono); text-align: center; }
  .print-status { width: min(100%, 28rem); display: flex; flex-direction: column; gap: 0.45rem; }
  .print-status > div { display: flex; justify-content: space-between; font-size: 0.72rem; }
  .print-status strong { font-family: var(--font-mono); }
  .preview-settings { min-width: 0; min-height: 0; display: flex; flex-direction: column; gap: 0.55rem; padding: 0.85rem; border-left: 1px solid var(--border); overflow-y: auto; }
  .settings-heading { display: flex; align-items: center; justify-content: space-between; padding: 0.15rem 0.15rem 0.3rem; font-size: 0.74rem; font-weight: 680; }
  .preview-actions { position: sticky; bottom: -0.85rem; display: flex; align-items: center; justify-content: flex-end; gap: 0.35rem; margin: auto -0.85rem -0.85rem; padding: 0.7rem 0.85rem; border-top: 1px solid var(--border); background: color-mix(in oklch, var(--popover) 94%, transparent); backdrop-filter: blur(14px); }
  .preview-settings :global(.input-group) { display: flex; min-width: 0; align-items: center; gap: 0.25rem; padding: 0.35rem; border: 1px solid var(--border); border-radius: var(--radius-md); background: color-mix(in oklch, var(--muted) 42%, transparent); }
  .preview-settings :global(.input-group-text) { flex: none; border: 0; padding: 0 0.3rem; background: transparent; color: var(--muted-foreground); font-size: 0.66rem; }
  .preview-settings :global(.form-control), .preview-settings :global(.form-select) { min-width: 0; height: 1.9rem; flex: 1; border: 1px solid var(--input); border-radius: var(--radius-sm); padding: 0 0.45rem; background: var(--background); color: var(--foreground); font-size: 0.68rem; }
  .preview-settings :global(.form-range) { min-width: 3rem; flex: 1; accent-color: var(--primary); }

  @media (max-width: 820px) {
    :global(.print-dialog) { height: min(94dvh, 58rem); }
    .preview-layout { grid-template-columns: 1fr; overflow-y: auto; }
    .preview-stage { min-height: 19rem; }
    .preview-settings { overflow: visible; border-top: 1px solid var(--border); border-left: 0; }
  }
</style>
