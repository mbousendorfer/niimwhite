<script lang="ts">
  import { type LabelProps, type OjectType } from "$/types";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import ZplImportButton from "$/components/designer-controls/ZplImportButton.svelte";
  import PdfImportButton from "$/components/designer-controls/PdfImportButton.svelte";
  import ShapesIcon from "@lucide/svelte/icons/shapes";
  import { Button } from "$/components/ui/button/index.js";
  import * as Popover from "$/components/ui/popover/index.js";

  interface Props {
    onSubmit: (i: OjectType) => void;
    labelProps: LabelProps;
    zplImageReady: (img: Blob) => void;
    pdfImageReady: (img: HTMLCanvasElement) => void;
  }

  let { onSubmit, labelProps, zplImageReady, pdfImageReady }: Props = $props();

  let open = $state<boolean>(false);
  let windowWidth = $state<number>(1024);

  const addObject = (type: OjectType) => {
    onSubmit(type);
    open = false;
  };

  const onZplReady = (image: Blob) => {
    zplImageReady(image);
    open = false;
  };

  const onPdfReady = (image: HTMLCanvasElement) => {
    pdfImageReady(image);
    open = false;
  };
</script>

<svelte:window bind:innerWidth={windowWidth} />

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon-lg"
        aria-label={$tr("editor.objectpicker.title")}
        title={$tr("editor.objectpicker.title")}>
        <ShapesIcon />
      </Button>
    {/snippet}
  </Popover.Trigger>

  <Popover.Content
    side={windowWidth <= 640 ? "top" : "right"}
    align={windowWidth <= 640 ? "end" : "start"}
    sideOffset={10}
    class="w-[min(24rem,calc(100vw-1rem))] gap-0 overflow-hidden p-0">
    <Popover.Header class="border-b px-3 py-2.5">
      <Popover.Title>{$tr("editor.objectpicker.title")}</Popover.Title>
      <Popover.Description>{$tr("editor.add")}</Popover.Description>
    </Popover.Header>

    <div class="object-grid">
      <Button variant="outline" onclick={() => addObject("text")}>
        <MdIcon icon="title" />
        {$tr("editor.objectpicker.text")}
      </Button>
      <Button variant="outline" onclick={() => addObject("line")}>
        <MdIcon icon="remove" />
        {$tr("editor.objectpicker.line")}
      </Button>
      <Button variant="outline" onclick={() => addObject("rectangle")}>
        <MdIcon icon="crop_square" />
        {$tr("editor.objectpicker.rectangle")}
      </Button>
      <Button variant="outline" onclick={() => addObject("circle")}>
        <MdIcon icon="radio_button_unchecked" />
        {$tr("editor.objectpicker.circle")}
      </Button>

      <Button variant="outline" onclick={() => addObject("image")}>
        <MdIcon icon="image" />
        {$tr("editor.objectpicker.image")}
      </Button>
      <Button variant="outline" onclick={() => addObject("qrcode")}>
        <MdIcon icon="qr_code_2" />
        {$tr("editor.objectpicker.qrcode")}
      </Button>
      <Button variant="outline" onclick={() => addObject("aruco")}>
        <MdIcon icon="grid_on" />
        {$tr("editor.objectpicker.aruco")}
      </Button>
      <Button variant="outline" onclick={() => addObject("barcode")}>
        <MdIcon icon="view_week" />
        {$tr("editor.objectpicker.barcode")}
      </Button>
    </div>

    <div class="import-actions">
      <ZplImportButton {labelProps} onImageReady={onZplReady} />
      <PdfImportButton {labelProps} onImageReady={onPdfReady} />
    </div>
  </Popover.Content>
</Popover.Root>

<style>
  .object-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 0.4rem; padding: 0.75rem; }
  .object-grid :global(button) { justify-content: flex-start; }
  .import-actions { display: flex; flex-wrap: wrap; gap: 0.4rem; padding: 0 0.75rem 0.75rem; }
</style>
