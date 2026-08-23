<script lang="ts">
  import Dropdown from "bootstrap/js/dist/dropdown";
  import * as fabric from "fabric";
  import { onDestroy, onMount, tick } from "svelte";
  import { ArUcoMarker } from "$/fabric-object/aruco";
  import { Barcode } from "$/fabric-object/barcode";
  import { QRCode } from "$/fabric-object/qrcode";
  import { iconCodepoints, type MaterialIcon } from "$/styles/mdi_icons";
  import { appConfig, automation, connectionState, csvData, loadedFonts } from "$/stores";
  import {
    type ExportedLabelTemplate,
    type FabricJson,
    type LabelProps,
    type MoveDirection,
    type OjectType,
  } from "$/types";
  import { FileUtils } from "$/utils/file_utils";
  import { tr } from "$/utils/i18n";
  import { LabelDesignerObjectHelper } from "$/utils/label_designer_object_helper";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { Toasts } from "$/utils/toasts";
  import { UndoRedo, type UndoState } from "$/utils/undo_redo";
  import BarcodeParamsPanel from "$/components/designer-controls/BarcodeParamsControls.svelte";
  import CsvControl from "$/components/designer-controls/CsvControl.svelte";
  import GenericObjectParamsControls from "$/components/designer-controls/GenericObjectParamsControls.svelte";
  import IconPicker from "$/components/designer-controls/IconPicker.svelte";
  import LabelPropsEditor from "$/components/designer-controls/LabelPropsEditor.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import ObjectPicker from "$/components/designer-controls/ObjectPicker.svelte";
  import PrintPreview from "$/components/PrintPreview.svelte";
  import ArUcoParamsPanel from "$/components/designer-controls/ArUcoParamsControls.svelte";
  import QrCodeParamsPanel from "$/components/designer-controls/QRCodeParamsControls.svelte";
  import TextParamsControls from "$/components/designer-controls/TextParamsControls.svelte";
  import VariableInsertControl from "$/components/designer-controls/VariableInsertControl.svelte";
  import { DEFAULT_LABEL_PROPS, GRID_SIZE, OBJECT_DEFAULTS } from "$/defaults";
  import { LabelDesignerUtils } from "$/utils/label_designer_utils";
  import SavedLabelsMenu from "$/components/designer-controls/SavedLabelsMenu.svelte";
  import { CustomCanvas } from "$/fabric-object/custom_canvas";
  import VectorParamsControls from "$/components/designer-controls/VectorParamsControls.svelte";
  import { CanvasUtils } from "$/utils/canvas_utils";
  import BarcodeIcon from "@lucide/svelte/icons/barcode";
  import CircleIcon from "@lucide/svelte/icons/circle";
  import EyeIcon from "@lucide/svelte/icons/eye";
  import Grid3X3Icon from "@lucide/svelte/icons/grid-3x3";
  import ImageIcon from "@lucide/svelte/icons/image";
  import MinusIcon from "@lucide/svelte/icons/minus";
  import PrinterIcon from "@lucide/svelte/icons/printer";
  import QrCodeIcon from "@lucide/svelte/icons/qr-code";
  import Redo2Icon from "@lucide/svelte/icons/redo-2";
  import ScanLineIcon from "@lucide/svelte/icons/scan-line";
  import SquareIcon from "@lucide/svelte/icons/square";
  import Trash2Icon from "@lucide/svelte/icons/trash-2";
  import TypeIcon from "@lucide/svelte/icons/type";
  import Undo2Icon from "@lucide/svelte/icons/undo-2";
  import { Button } from "$/components/ui/button/index.js";
  import { Separator } from "$/components/ui/separator/index.js";
  import * as Tooltip from "$/components/ui/tooltip/index.js";
  import StudioToolButton from "$/components/basic/StudioToolButton.svelte";
  import MousePointer2Icon from "@lucide/svelte/icons/mouse-pointer-2";
  import Settings2Icon from "@lucide/svelte/icons/settings-2";
  import * as Empty from "$/components/ui/empty/index.js";
  import { ScrollArea } from "$/components/ui/scroll-area/index.js";
  import * as Tabs from "$/components/ui/tabs/index.js";

  let htmlCanvas: HTMLCanvasElement;

  let fabricCanvas = $state<CustomCanvas>();
  let labelProps = $state<LabelProps>(DEFAULT_LABEL_PROPS);
  let previewOpened = $state<boolean>(false);
  let selectedObject = $state<fabric.FabricObject | undefined>(undefined);
  let selectedCount = $state<number>(0);
  let editRevision = $state<number>(0);
  let printNow = $state<boolean>(false);
  let csvEnabled = $state<boolean>(false);
  let windowWidth = $state<number>(0);
  let undoState = $state<UndoState>({ undoDisabled: false, redoDisabled: false });
  let zoomText = $state<string>("100%");
  let inspectorTab = $state<"label" | "selection">("label");

  const undo = new UndoRedo();

  const discardSelection = () => {
    fabricCanvas!.discardActiveObject();
    fabricCanvas!.requestRenderAll();
    selectedObject = undefined;
    selectedCount = 0;
    editRevision = 0;
  };

  const loadLabelData = async (data: ExportedLabelTemplate) => {
    undo.paused = true;
    onUpdateLabelProps(data.label);
    if (data.csv) {
      $csvData = data.csv;
      csvEnabled = true;
    }
    await FileUtils.loadCanvasState(fabricCanvas!, data.canvas);
    undo.paused = false;
  };

  undo.onLabelUpdate = loadLabelData;
  undo.onStateUpdate = (state: UndoState) => {
    undoState = state;
  };

  const deleteSelected = () => {
    LabelDesignerUtils.deleteSelection(fabricCanvas!);
    discardSelection();
  };

  const cloneSelected = () => {
    LabelDesignerUtils.cloneSelection(fabricCanvas!).then(() => undo.push(fabricCanvas!, labelProps));
  };

  const moveSelected = (direction: MoveDirection, ctrl?: boolean) => {
    LabelDesignerUtils.moveSelection(fabricCanvas!, direction, ctrl);
    undo.push(fabricCanvas!, labelProps);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    const key: string = e.key.toLowerCase();
    // windows and linux users are used to ctrl, mac users use cmd
    const cmdOrCtrl = e.metaKey || e.ctrlKey;

    // Esc
    if (key === "escape") {
      discardSelection();
      return;
    }

    if (LabelDesignerUtils.isAnyInputFocused(fabricCanvas!)) {
      return;
    }

    // Arrows
    if (key.startsWith("arrow")) {
      moveSelected(key.slice("arrow".length) as MoveDirection, cmdOrCtrl);
      return;
    }

    if (e.repeat) {
      return;
    }

    // Ctrl + D
    if (cmdOrCtrl && key === "d") {
      e.preventDefault();
      cloneSelected();
      return;
    }

    // Ctrl + Y, Ctrl + Shift + Z
    if ((cmdOrCtrl && key === "y") || (cmdOrCtrl && e.shiftKey && key === "z")) {
      e.preventDefault();
      if (!undoState.redoDisabled) {
        undo.redo();
      }
      return;
    }

    // Ctrl + Z
    if (cmdOrCtrl && key === "z") {
      e.preventDefault();
      if (!undoState.undoDisabled) {
        undo.undo();
      }
      return;
    }

    // Del
    if (key === "delete" || key === "backspace") {
      deleteSelected();
      return;
    }
  };

  const onUpdateLabelProps = (newProps: LabelProps) => {
    labelProps = newProps;
    fabricCanvas!.setDimensions(labelProps.size);
    fabricCanvas!.virtualZoom(fabricCanvas!.getVirtualZoom());
    try {
      LocalStoragePersistence.saveLastLabelProps(labelProps);
      undo.push(fabricCanvas!, labelProps);
    } catch (e) {
      Toasts.zodErrors(e, "Label parameters save error:");
    }
  };

  const exportCurrentLabel = (): ExportedLabelTemplate => {
    return FileUtils.makeExportedLabel(fabricCanvas!, labelProps, csvEnabled);
  };

  const onLoadRequested = (label: ExportedLabelTemplate) => {
    loadLabelData(label).then(() => undo.push(fabricCanvas!, labelProps));
  };

  const zplImageReady = async (img: Blob) => {
    await LabelDesignerObjectHelper.addImageBlob(fabricCanvas!, img);
    undo.push(fabricCanvas!, labelProps);
  };

  const pdfImageReady = async (el: HTMLCanvasElement) => {
    const img = new fabric.FabricImage(el, {
      ...OBJECT_DEFAULTS,
      left: 0,
      top: 0,
    });

    fabricCanvas!.add(img);
    fabricCanvas!.setActiveObject(img);
    undo.push(fabricCanvas!, labelProps);
  };

  const onObjectPicked = (objectType: OjectType) => {
    const obj = LabelDesignerObjectHelper.addObject(fabricCanvas!, objectType);
    if (obj !== undefined) {
      fabricCanvas!.setActiveObject(obj);
      undo.push(fabricCanvas!, labelProps);
    }
  };

  const onIconPicked = (i: MaterialIcon) => {
    // todo: icon is not vertically centered
    LabelDesignerObjectHelper.addStaticText(fabricCanvas!, String.fromCodePoint(iconCodepoints[i]), {
      fontFamily: "Material Icons",
      fontSize: 100,
    });
    undo.push(fabricCanvas!, labelProps);
  };

  const onSvgIconPicked = (i: string) => {
    LabelDesignerObjectHelper.addSvg(fabricCanvas!, i);
    undo.push(fabricCanvas!, labelProps);
  };

  const openPreview = () => {
    printNow = false;
    previewOpened = true;
  };

  const openPreviewAndPrint = () => {
    printNow = true;
    previewOpened = true;
  };

  const controlValueUpdated = () => {
    if (selectedObject) {
      selectedObject.setCoords();
      selectedObject.dirty = true;
      undo.push(fabricCanvas!, labelProps);
    }
    fabricCanvas!.requestRenderAll();

    // trigger reactivity for controls
    editRevision++;
  };

  const getCanvasForPreview = (): FabricJson => {
    return fabricCanvas!.toJSON();
  };

  const onCsvPlaceholderPicked = (name: string) => {
    const obj = LabelDesignerObjectHelper.addText(fabricCanvas!, `{${name}}`, {
      textAlign: "left",
      originX: "left",
      originY: "top",
    });
    fabricCanvas!.setActiveObject(obj);
    undo.push(fabricCanvas!, labelProps);
  };

  const onPaste = async (event: ClipboardEvent) => {
    if (LabelDesignerUtils.isAnyInputFocused(fabricCanvas!)) {
      return;
    }

    const openedDropdowns = document.querySelectorAll(".dropdown-menu.show");
    if (openedDropdowns.length > 0) {
      return;
    }

    if (event.clipboardData != null) {
      event.preventDefault();
      const obj = await LabelDesignerObjectHelper.addObjectFromClipboard(fabricCanvas!, event.clipboardData);

      if (obj !== undefined) {
        fabricCanvas!.setActiveObject(obj);
        undo.push(fabricCanvas!, labelProps);
      }
    }
  };

  const clearCanvas = () => {
    if (!confirm($tr("editor.clear.confirm"))) {
      return;
    }
    undo.push(fabricCanvas!, labelProps);
    fabricCanvas!.clear();
  };

  const toggleGrid = () => {
    const newVal = !$appConfig.gridEnabled;
    appConfig.update((cfg) => ({ ...cfg, gridEnabled: newVal }));
    fabricCanvas?.setGridEnabled(newVal);
  };

  const loadLabelFromUrl = async () => {
    try {
      const urlTemplate = await FileUtils.readLabelFromUrl();

      if (urlTemplate !== null && confirm($tr("params.saved_labels.load.url.warn"))) {
        onLoadRequested(urlTemplate);
        Toasts.message($tr("params.saved_labels.load.url.loaded"));
        return true;
      }
    } catch (e) {
      Toasts.error(e);
    }
    return false;
  }

  const loadDefaultLabel = async () => {
    const urlLoaded = await loadLabelFromUrl();

    if (urlLoaded) {
      return;
    }

    try {
      const defaultTemplate = LocalStoragePersistence.loadDefaultTemplate();

      if (defaultTemplate !== null) {
        onLoadRequested(defaultTemplate);
        return;
      }
    } catch (e) {
      Toasts.error(e);
    }

    LabelDesignerObjectHelper.addText(fabricCanvas!, $tr("editor.default_text"));
  };

  const renderOnFontsChanged = () => {
    fabricCanvas?.forEachObject((o) => {
      if (o instanceof fabric.Textbox) {
        o.dirty = true;
      }
    });
    fabricCanvas?.requestRenderAll();
  };

  onMount(async () => {
    try {
      const savedLabelProps = LocalStoragePersistence.loadLastLabelProps();
      if (savedLabelProps !== null) {
        labelProps = savedLabelProps;
      }
    } catch (e) {
      Toasts.zodErrors(e, "Label parameters load error:");
    }

    fabricCanvas = new CustomCanvas(htmlCanvas, {
      width: labelProps.size.width,
      height: labelProps.size.height,
    });
    fabricCanvas.setLabelProps(labelProps);
    fabricCanvas.onZoomChange = (z) => {
      zoomText = Math.round(z * 100) + "%";
    };
    fabricCanvas.setGridEnabled(!!$appConfig.gridEnabled);

    await loadDefaultLabel();

    window.addEventListener("hashchange", loadLabelFromUrl);

    undo.push(fabricCanvas, labelProps);

    // force close dropdowns on touch devices
    fabricCanvas.on("mouse:down", (): void => {
      const dropdowns = document.querySelectorAll("[data-bs-toggle='dropdown']");
      dropdowns.forEach((el) => new Dropdown(el).hide());
    });

    fabricCanvas.on("object:moving", (e): void => {
      if (e.target && e.target.left !== undefined && e.target.top !== undefined) {
        e.target.set({
          left: Math.round(e.target.left / GRID_SIZE) * GRID_SIZE,
          top: Math.round(e.target.top / GRID_SIZE) * GRID_SIZE,
        });
      }
    });

    fabricCanvas.on("object:modified", (): void => {
      undo.push(fabricCanvas!, labelProps);
    });

    fabricCanvas.on("text:changed", () => {
      editRevision++;
    });

    fabricCanvas.on("object:removed", (): void => {
      undo.push(fabricCanvas!, labelProps);
    });

    fabricCanvas.on("selection:created", (e): void => {
      selectedCount = e.selected?.length ?? 0;
      selectedObject = e.selected?.length === 1 ? e.selected[0] : undefined;
      editRevision++;
      inspectorTab = "selection";
    });

    fabricCanvas.on("selection:updated", (e): void => {
      selectedCount = e.selected?.length ?? 0;
      selectedObject = e.selected?.length === 1 ? e.selected[0] : undefined;
      editRevision++;
      inspectorTab = "selection";
    });

    fabricCanvas.on("selection:cleared", (): void => {
      selectedObject = undefined;
      selectedCount = 0;
      editRevision++;
      inspectorTab = "label";
    });

    fabricCanvas.on("dragover", (e): void => {
      e.e.preventDefault();
    });

    fabricCanvas.on("drop:after", async (e): Promise<void> => {
      const dragEvt = e.e as DragEvent;
      dragEvt.preventDefault();

      let dropped = false;

      if (dragEvt.dataTransfer?.files) {
        for (const file of dragEvt.dataTransfer.files) {
          try {
            await LabelDesignerObjectHelper.addImageFile(fabricCanvas!, file);
            dropped = true;
          } catch (e) {
            Toasts.error(e);
          }
        }

        if (dropped) {
          undo.push(fabricCanvas!, labelProps);
        }
      }
    });

    fabricCanvas.on("object:scaling", (e): void => {
      if (!e.target) {
        return;
      }

      CanvasUtils.fixFabricObjectScale(e.target);
    });

    // userFonts.subscribe((e) => {console.log(e); renderOnFontsChanged();});

    if ($automation !== undefined) {
      if ($automation.startPrint !== undefined) {
        if ($automation.startPrint === "immediately") {
          openPreview();
        } else if ($automation.startPrint === "after_connect") {
          const unsubscribe = connectionState.subscribe((st) => {
            if (st === "connected") {
              tick().then(() => unsubscribe());
              openPreviewAndPrint();
            }
          });
        }
      }
    }
  });

  onDestroy(() => {
    fabricCanvas!.dispose();
    window.removeEventListener("hashchange", loadLabelFromUrl);
  });

  $effect(() => {
    fabricCanvas?.setLabelProps(labelProps);
  });

  $effect(() => {
    if (!previewOpened) {
      printNow = false;
    }
  });

  $effect(() => {
    if ($loadedFonts) {
      renderOnFontsChanged();
    }
  });
</script>

<svelte:window bind:innerWidth={windowWidth} onkeydown={onKeyDown} onpaste={onPaste} />

<Tooltip.Provider delayDuration={350}>
  <div class="editor-workspace">
    <aside class="tool-rail studio-surface" aria-label={$tr("editor.tools")}>
      <span class="rail-label">{$tr("editor.add")}</span>
      <StudioToolButton icon={TypeIcon} label={$tr("editor.objectpicker.text")} onclick={() => onObjectPicked("text")} />
      <StudioToolButton icon={ImageIcon} label={$tr("editor.objectpicker.image")} onclick={() => onObjectPicked("image")} />
      <StudioToolButton icon={SquareIcon} label={$tr("editor.objectpicker.rectangle")} onclick={() => onObjectPicked("rectangle")} />
      <StudioToolButton icon={CircleIcon} label={$tr("editor.objectpicker.circle")} onclick={() => onObjectPicked("circle")} />
      <StudioToolButton icon={MinusIcon} label={$tr("editor.objectpicker.line")} onclick={() => onObjectPicked("line")} />
      <Separator class="my-1 w-7" />
      <StudioToolButton icon={QrCodeIcon} label={$tr("editor.objectpicker.qrcode")} onclick={() => onObjectPicked("qrcode")} />
      <StudioToolButton icon={BarcodeIcon} label={$tr("editor.objectpicker.barcode")} onclick={() => onObjectPicked("barcode")} />
      <StudioToolButton icon={ScanLineIcon} label={$tr("editor.objectpicker.aruco")} onclick={() => onObjectPicked("aruco")} />
      <Separator class="my-1 w-7" />
      <div class="legacy-rail-control" title={$tr("editor.iconpicker.title")}>
        <IconPicker onSubmit={onIconPicked} onSubmitSvg={onSvgIconPicked} />
      </div>
      <div class="legacy-rail-control" title={$tr("editor.objectpicker.title")}>
        <ObjectPicker onSubmit={onObjectPicked} {labelProps} {zplImageReady} {pdfImageReady} />
      </div>
    </aside>

    <section class="canvas-panel studio-surface">
      <header class="canvas-toolbar">
        <div class="toolbar-group document-actions">
          <SavedLabelsMenu
            canvas={fabricCanvas!}
            onRequestLabelTemplate={exportCurrentLabel}
            {onLoadRequested}
            {csvEnabled} />
          <CsvControl bind:enabled={csvEnabled} onPlaceholderPicked={onCsvPlaceholderPicked} />
          <Button variant="ghost" size="icon-sm" onclick={clearCanvas} aria-label={$tr("editor.clear")}>
            <Trash2Icon />
          </Button>
        </div>

        <div class="toolbar-group history-actions">
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={undoState.undoDisabled}
            onclick={() => undo.undo()}
            aria-label={$tr("editor.undo")}>
            <Undo2Icon />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            disabled={undoState.redoDisabled}
            onclick={() => undo.redo()}
            aria-label={$tr("editor.redo")}>
            <Redo2Icon />
          </Button>
          <Button
            variant={$appConfig.gridEnabled ? "secondary" : "ghost"}
            size="icon-sm"
            onclick={toggleGrid}
            aria-label={$tr("editor.grid")}>
            <Grid3X3Icon />
          </Button>
          <Button variant="ghost" size="sm" class="metric" onclick={() => fabricCanvas?.resetVirtualZoom()}>
            {zoomText}
          </Button>
        </div>

        <div class="toolbar-group print-actions">
          <Button variant="outline" size="sm" onclick={openPreview}>
            <EyeIcon data-icon="inline-start" />
            {$tr("editor.preview")}
          </Button>
          <Button size="sm" onclick={openPreviewAndPrint} disabled={$connectionState !== "connected"}>
            <PrinterIcon data-icon="inline-start" />
            {$tr("editor.print")}
          </Button>
        </div>
      </header>

      <div class="canvas-stage studio-grid">
        <div class="canvas-glow" aria-hidden="true"></div>
        <div class="canvas-wrapper print-start-{labelProps.printDirection}">
          <canvas bind:this={htmlCanvas}></canvas>
        </div>
      </div>

      <footer class="canvas-status">
        <span class="status-ready"><span></span>{$tr("editor.ready")}</span>
        <span class="metric">{labelProps.size.width} × {labelProps.size.height} PX</span>
        <span class="metric">{$appConfig.gridEnabled ? $tr("editor.grid_on") : $tr("editor.grid_off")}</span>
      </footer>
    </section>

    <aside class="inspector-panel studio-surface" aria-label={$tr("editor.inspector")}>
      <Tabs.Root bind:value={inspectorTab} class="inspector-tabs">
        <div class="inspector-heading">
          <div>
            <span class="inspector-kicker">{$tr("editor.inspector")}</span>
            <strong>{inspectorTab === "label" ? $tr("editor.document") : $tr("editor.selection")}</strong>
          </div>
          {#if inspectorTab === "label"}<Settings2Icon />{:else}<MousePointer2Icon />{/if}
        </div>

        <Tabs.List variant="line" class="inspector-tab-list">
          <Tabs.Trigger value="label">{$tr("editor.document")}</Tabs.Trigger>
          <Tabs.Trigger value="selection" disabled={selectedCount === 0}>
            {$tr("editor.selection")}
            {#if selectedCount > 0}<span class="selection-badge">{selectedCount}</span>{/if}
          </Tabs.Trigger>
        </Tabs.List>

        <ScrollArea class="inspector-scroll">
          <Tabs.Content value="label" class="inspector-content">
            <section class="inspector-section">
              <div class="section-heading">
                <span>{$tr("params.label.menu_title")}</span>
                <span class="metric">PX</span>
              </div>
              <div class="property-row"><span>{$tr("params.label.size")}</span><strong>{labelProps.size.width} × {labelProps.size.height}</strong></div>
              <div class="property-row"><span>{$tr("params.label.direction")}</span><strong>{$tr(`params.label.direction.${labelProps.printDirection}`)}</strong></div>
              <div class="property-row"><span>{$tr("params.label.shape")}</span><strong>{labelProps.shape ?? "rect"}</strong></div>
              <div class="inspector-editor-trigger">
                <LabelPropsEditor {labelProps} onChange={onUpdateLabelProps} />
                <span>{$tr("editor.edit_label")}</span>
              </div>
            </section>

            <section class="inspector-section">
              <div class="section-heading"><span>{$tr("editor.canvas_view")}</span></div>
              <button class="property-action" onclick={toggleGrid}>
                <span>{$tr("editor.grid")}</span>
                <span class:active-value={$appConfig.gridEnabled}>{$appConfig.gridEnabled ? $tr("editor.on") : $tr("editor.off")}</span>
              </button>
              <button class="property-action" onclick={() => fabricCanvas?.resetVirtualZoom()}>
                <span>{$tr("editor.zoom")}</span><span class="metric">{zoomText}</span>
              </button>
            </section>
          </Tabs.Content>

          <Tabs.Content value="selection" class="inspector-content">
            {#if selectedCount > 0}
              <section class="selection-actions">
                <div>
                  <strong>{selectedCount}</strong>
                  <span>{$tr(selectedCount === 1 ? "editor.selected.one" : "editor.selected.many")}</span>
                </div>
                <div class="selection-buttons">
                  <Button variant="outline" size="sm" onclick={cloneSelected}>
                    <MdIcon icon="content_copy" /> {$tr("editor.clone")}
                  </Button>
                  <Button variant="destructive" size="sm" onclick={deleteSelected}>
                    <Trash2Icon /> {$tr("editor.delete")}
                  </Button>
                </div>
              </section>

              <div class="inspector-controls">
                {#if selectedObject && selectedCount === 1}
                  <GenericObjectParamsControls {selectedObject} {editRevision} valueUpdated={controlValueUpdated} />
                {/if}
                {#if selectedObject}<VectorParamsControls {selectedObject} {editRevision} valueUpdated={controlValueUpdated} />{/if}
                {#if selectedObject instanceof fabric.IText}<TextParamsControls selectedText={selectedObject} {editRevision} valueUpdated={controlValueUpdated} />{/if}
                {#if selectedObject instanceof QRCode}<QrCodeParamsPanel selectedQRCode={selectedObject} {editRevision} valueUpdated={controlValueUpdated} />{/if}
                {#if selectedObject instanceof ArUcoMarker}<ArUcoParamsPanel selectedArUco={selectedObject} {editRevision} valueUpdated={controlValueUpdated} />{/if}
                {#if selectedObject instanceof Barcode}<BarcodeParamsPanel selectedBarcode={selectedObject} {editRevision} valueUpdated={controlValueUpdated} />{/if}
                {#if selectedObject instanceof fabric.IText || selectedObject instanceof QRCode || (selectedObject instanceof Barcode && selectedObject.encoding === "CODE128B")}
                  <VariableInsertControl {selectedObject} valueUpdated={controlValueUpdated} />
                {/if}
              </div>
            {:else}
              <Empty.Root class="inspector-empty">
                <Empty.Header>
                  <Empty.Media variant="icon"><MousePointer2Icon /></Empty.Media>
                  <Empty.Title>{$tr("editor.nothing_selected")}</Empty.Title>
                  <Empty.Description>{$tr("editor.selection_hint")}</Empty.Description>
                </Empty.Header>
              </Empty.Root>
            {/if}
          </Tabs.Content>
        </ScrollArea>
      </Tabs.Root>
    </aside>
  </div>

  {#if previewOpened}
    <PrintPreview
      bind:show={previewOpened}
      canvasCallback={getCanvasForPreview}
      {labelProps}
      {printNow}
      {csvEnabled}
      csvData={$csvData.data} />
  {/if}
</Tooltip.Provider>

<style>
  .editor-workspace {
    height: 100%;
    min-height: 0;
    display: grid;
    grid-template-columns: 3.75rem minmax(0, 1fr) minmax(17rem, 20rem);
    gap: 0.65rem;
  }

  .tool-rail {
    display: flex;
    min-height: 0;
    flex-direction: column;
    align-items: center;
    gap: 0.12rem;
    padding: 0.65rem 0.35rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    animation: studio-enter 420ms cubic-bezier(.2,.8,.2,1) both;
  }

  .rail-label {
    margin-bottom: 0.25rem;
    color: var(--muted-foreground);
    font: 600 0.52rem/1 var(--font-mono);
    letter-spacing: 0.14em;
    text-transform: uppercase;
  }

  .legacy-rail-control :global(.btn) {
    width: 2.25rem;
    height: 2.25rem;
    border: 0;
    border-radius: 0.65rem;
    background: transparent;
  }

  .canvas-panel {
    min-width: 0;
    min-height: 0;
    display: grid;
    grid-template-rows: auto minmax(12rem, 1fr) auto;
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    overflow: hidden;
    animation: studio-enter 520ms 40ms cubic-bezier(.2,.8,.2,1) both;
  }

  .canvas-toolbar {
    min-width: 0;
    display: grid;
    grid-template-columns: 1fr auto 1fr;
    align-items: center;
    gap: 0.5rem;
    min-height: 3rem;
    padding: 0.45rem 0.65rem;
    border-bottom: 1px solid var(--border);
  }

  .toolbar-group { display: flex; min-width: 0; align-items: center; gap: 0.25rem; }
  .history-actions { justify-content: center; }
  .print-actions { justify-content: flex-end; }

  .canvas-stage {
    position: relative;
    min-width: 0;
    min-height: 0;
    display: grid;
    place-items: center;
    padding: clamp(1rem, 4vw, 3.5rem);
    overflow: auto;
    background-color: color-mix(in oklch, var(--background) 74%, black);
  }

  .canvas-glow {
    position: absolute;
    width: min(64vw, 54rem);
    height: min(36vw, 28rem);
    border-radius: 50%;
    background: color-mix(in oklch, var(--info) 7%, transparent);
    filter: blur(5rem);
    pointer-events: none;
  }

  .canvas-wrapper {
    position: relative;
    border: 1px solid color-mix(in oklch, var(--paper-foreground) 18%, transparent);
    border-radius: 0.25rem;
    background: var(--paper);
    box-shadow: 0 2rem 5rem rgb(0 0 0 / 0.42), 0 0 0 1px rgb(255 255 255 / 0.08);
    max-width: 100%;
    max-height: 100%;
    overflow: auto;
  }

  .canvas-wrapper.print-start-left { border-left: 3px solid var(--primary); }
  .canvas-wrapper.print-start-top { border-top: 3px solid var(--primary); }
  .canvas-wrapper canvas {
    image-rendering: pixelated;
    display: block;
  }

  .inspector-panel {
    min-width: 0;
    min-height: 0;
    border: 1px solid var(--border);
    border-radius: var(--radius-xl);
    overflow: hidden;
    animation: studio-enter 580ms 80ms cubic-bezier(.2,.8,.2,1) both;
  }

  .inspector-tabs { height: 100%; display: grid; grid-template-rows: auto auto minmax(0, 1fr); }

  .inspector-heading {
    min-height: 3.5rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0.75rem 0.9rem 0.55rem;
  }

  .inspector-heading > div { display: flex; flex-direction: column; gap: 0.1rem; }
  .inspector-heading strong { font-size: 0.92rem; font-weight: 650; }
  .inspector-heading > :global(svg) { width: 1rem; color: var(--muted-foreground); }
  .inspector-kicker { color: var(--muted-foreground); font: 600 0.55rem/1.2 var(--font-mono); letter-spacing: 0.14em; text-transform: uppercase; }
  .inspector-tab-list { width: calc(100% - 1.4rem); margin: 0 0.7rem 0.5rem; }
  .selection-badge { min-width: 1rem; height: 1rem; display: inline-grid; place-items: center; border-radius: 999px; background: var(--primary); color: var(--primary-foreground); font: 600 0.55rem/1 var(--font-mono); }
  .inspector-scroll { min-height: 0; }
  .inspector-content { display: flex; flex-direction: column; gap: 0.7rem; padding: 0.4rem 0.75rem 1rem; }

  .inspector-section {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.7rem;
    border: 1px solid var(--border);
    border-radius: var(--radius-lg);
    background: color-mix(in oklch, var(--muted) 45%, transparent);
  }

  .section-heading { display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.4rem; font-size: 0.72rem; font-weight: 650; }
  .property-row, .property-action { min-height: 2rem; display: flex; align-items: center; justify-content: space-between; gap: 0.5rem; color: var(--muted-foreground); font-size: 0.7rem; }
  .property-row strong { max-width: 55%; color: var(--foreground); font: 520 0.66rem/1.2 var(--font-mono); text-align: right; }
  .property-action { width: 100%; border: 0; background: transparent; text-align: left; }
  .property-action:hover { color: var(--foreground); }
  .active-value { color: var(--success); }

  .inspector-editor-trigger {
    display: flex;
    align-items: center;
    gap: 0.55rem;
    margin-top: 0.5rem;
    padding-top: 0.55rem;
    border-top: 1px solid var(--border);
    color: var(--foreground);
    font-size: 0.72rem;
    font-weight: 600;
  }

  .selection-actions { display: flex; flex-direction: column; gap: 0.65rem; padding-bottom: 0.7rem; border-bottom: 1px solid var(--border); }
  .selection-actions > div:first-child { display: flex; align-items: baseline; gap: 0.35rem; }
  .selection-actions > div:first-child strong { font: 650 1.35rem/1 var(--font-mono); }
  .selection-actions > div:first-child span { color: var(--muted-foreground); font-size: 0.7rem; }
  .selection-buttons { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; }
  .inspector-controls { display: flex; flex-wrap: wrap; align-items: center; gap: 0.3rem; padding-top: 0.2rem; }
  .inspector-empty { min-height: 15rem; border: 0; color: var(--muted-foreground); }

  .canvas-status {
    display: flex;
    align-items: center;
    gap: 1.25rem;
    min-height: 1.75rem;
    padding: 0 0.75rem;
    border-top: 1px solid var(--border);
  }

  .status-ready { display: inline-flex; align-items: center; gap: 0.4rem; margin-right: auto; color: var(--muted-foreground); font-size: 0.66rem; }
  .status-ready span { width: 0.38rem; height: 0.38rem; border-radius: 50%; background: var(--success); box-shadow: 0 0 0.65rem var(--success); }

  @keyframes studio-enter {
    from { opacity: 0; transform: translateY(0.5rem); }
    to { opacity: 1; transform: translateY(0); }
  }

  @media (max-width: 900px) {
    .editor-workspace { grid-template-columns: 3.75rem minmax(0, 1fr); }
    .inspector-panel { display: none; }
    .canvas-toolbar { grid-template-columns: 1fr auto; }
    .history-actions { display: none; }
  }
</style>
