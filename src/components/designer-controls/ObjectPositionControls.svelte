<script lang="ts">
  import { tr } from "$/utils/i18n";
  import * as fabric from "fabric";
  import { onDestroy } from "svelte";
  import QRCode from "$/fabric-object/qrcode";
  import Barcode from "$/fabric-object/barcode";

  interface Props {
    selectedObject: fabric.FabricObject;
  }
  let { selectedObject }: Props = $props();
  let prevObject: fabric.FabricObject | undefined;
  let x = $state<number>();
  let y = $state<number>();
  let width = $state<number>();
  let height = $state<number>();
  let widthScaled = $state<number>();
  let heightScaled = $state<number>();
  let keepAspectRatio = $state(false);

  const objectDimensionsChanged = (e?: fabric.ModifiedEvent) => {
    const pos = selectedObject.getPointByOrigin("left", "top");
    x = Math.round(pos.x);
    y = Math.round(pos.y);
    width = Math.round(selectedObject.width);
    height = Math.round(selectedObject.height);
    updateScales(e?.action);
  };

  const objectChanged = (newObject: fabric.FabricObject) => {
    prevObject?.off("modified", objectDimensionsChanged);
    newObject.on("modified", objectDimensionsChanged);
    objectDimensionsChanged();
    prevObject = newObject;
  };

  const updateObject = (e: Event, source?: "width" | "height") => {
    selectedObject.setPositionByOrigin(new fabric.Point(Math.round(x!), Math.round(y!)), "left", "top");
    if (selectedObject instanceof fabric.FabricImage) {
      if (keepAspectRatio) {
        const scale =
          source === "width" ? widthScaled! / selectedObject.width! : heightScaled! / selectedObject.height!;
        selectedObject.scaleX = scale;
        selectedObject.scaleY = scale;
      } else {
        selectedObject.scaleX = widthScaled! / selectedObject.width!;
        selectedObject.scaleY = heightScaled! / selectedObject.height!;
      }
      updateScales();
    } else {
      selectedObject.set({ width: Math.round(Math.max(width!, 1)), height: Math.round(Math.max(height!, 1)) });
    }
    selectedObject.setCoords();
    selectedObject.canvas?.requestRenderAll();
  };

  const toggleAspectRatio = (e: Event) => {
    if (keepAspectRatio) {
      selectedObject.scaleX = Math.min(selectedObject.scaleX, selectedObject.scaleY);
      selectedObject.scaleY = selectedObject.scaleX;
      updateScales();
      updateObject(e);
    }
  };

  const updateScales = (action?: string) => {
    widthScaled = Math.round(width! * selectedObject.scaleX);
    heightScaled = Math.round(height! * selectedObject.scaleY);
    if (action === "scaleX" || action === "scaleY") keepAspectRatio = false;
    if ((action === "scale" || action === undefined) && selectedObject.scaleX === selectedObject.scaleY)
      keepAspectRatio = true;
  };

  onDestroy(() => selectedObject.off("modified", objectDimensionsChanged));
  $effect(() => objectChanged(selectedObject));
</script>

<div class="inspector-subgroup">
  <div class="inspector-subgroup-title">{$tr("inspector.coordinates")}</div>
  <div class="inspector-field-grid inspector-field-grid-2">
    <label class="inspector-field"
      ><span>X</span>
      <div class="inspector-value">
        <input type="number" bind:value={x} onchange={updateObject} /><small>px</small>
      </div></label>
    <label class="inspector-field"
      ><span>Y</span>
      <div class="inspector-value">
        <input type="number" bind:value={y} onchange={updateObject} /><small>px</small>
      </div></label>
  </div>
</div>

{#if !(selectedObject instanceof fabric.FabricText || selectedObject instanceof QRCode || selectedObject instanceof Barcode)}
  <div class="inspector-subgroup">
    <div class="inspector-subgroup-title">{$tr("inspector.dimensions")}</div>
    <div class="inspector-field-grid inspector-field-grid-2">
      {#if selectedObject instanceof fabric.FabricImage}
        <label class="inspector-field"
          ><span>{$tr("inspector.width")}</span>
          <div class="inspector-value">
            <input type="number" min="1" bind:value={widthScaled} onchange={(e) => updateObject(e, "width")} /><small
              >px</small>
          </div></label>
        <label class="inspector-field"
          ><span>{$tr("inspector.height")}</span>
          <div class="inspector-value">
            <input type="number" min="1" bind:value={heightScaled} onchange={(e) => updateObject(e, "height")} /><small
              >px</small>
          </div></label>
      {:else}
        <label class="inspector-field"
          ><span>{$tr("inspector.width")}</span>
          <div class="inspector-value">
            <input type="number" min="1" bind:value={width} onchange={(e) => updateObject(e, "width")} /><small
              >px</small>
          </div></label>
        <label class="inspector-field"
          ><span>{$tr("inspector.height")}</span>
          <div class="inspector-value">
            <input type="number" min="1" bind:value={height} onchange={(e) => updateObject(e, "height")} /><small
              >px</small>
          </div></label>
      {/if}
    </div>
    {#if selectedObject instanceof fabric.FabricImage}
      <label class="inspector-switch-row"
        ><span>{$tr("params.generic.keepAspectRatio")}</span><input
          type="checkbox"
          role="switch"
          bind:checked={keepAspectRatio}
          onchange={toggleAspectRatio} /></label>
    {/if}
  </div>
{/if}
