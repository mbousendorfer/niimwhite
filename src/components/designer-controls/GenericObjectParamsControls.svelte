<script lang="ts">
  import * as fabric from "fabric";
  import { tr } from "$/utils/i18n";
  import { appConfig } from "$/stores";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import ObjectPositionControls from "$/components/designer-controls/ObjectPositionControls.svelte";

  interface Props {
    selectedObject: fabric.FabricObject;
    editRevision: number;
    valueUpdated: () => void;
  }
  let { selectedObject, editRevision, valueUpdated }: Props = $props();

  const center = (axis: "horizontal" | "vertical") => {
    if (axis === "horizontal") selectedObject.canvas!.centerObjectH(selectedObject);
    else selectedObject.canvas!.centerObjectV(selectedObject);
    valueUpdated();
  };
  const bringTo = (to: "top" | "bottom") => {
    if (to === "top") selectedObject.canvas?.bringObjectToFront(selectedObject);
    else selectedObject.canvas?.sendObjectToBack(selectedObject);
    valueUpdated();
  };
  const fit = () => {
    const imageRatio = selectedObject.width / selectedObject.height;
    const canvasRatio = selectedObject.canvas!.width / selectedObject.canvas!.height;
    if ($appConfig.fitMode === "ratio_min") {
      if (imageRatio > canvasRatio) selectedObject.scaleToWidth(selectedObject.canvas!.width);
      else selectedObject.scaleToHeight(selectedObject.canvas!.height);
      selectedObject.canvas!.centerObject(selectedObject);
    } else if ($appConfig.fitMode === "ratio_max") {
      if (imageRatio > canvasRatio) selectedObject.scaleToHeight(selectedObject.canvas!.height);
      else selectedObject.scaleToWidth(selectedObject.canvas!.width);
      selectedObject.canvas!.centerObject(selectedObject);
    } else
      selectedObject.set({
        left: 0,
        top: 0,
        scaleX: selectedObject.canvas!.width / selectedObject.width,
        scaleY: selectedObject.canvas!.height / selectedObject.height,
      });
    valueUpdated();
  };
</script>

<input type="hidden" value={editRevision} />
<section class="inspector-control-section">
  <header class="inspector-control-heading">
    <div><strong>{$tr("inspector.transform")}</strong><span>{$tr("inspector.transform.help")}</span></div>
    <MdIcon icon="open_with" />
  </header>
  <ObjectPositionControls {selectedObject} />
  <div class="inspector-subgroup">
    <div class="inspector-subgroup-title">{$tr("inspector.alignment")}</div>
    <div class="inspector-segmented inspector-segmented-2">
      <button onclick={() => center("horizontal")} title={$tr("params.generic.center.horizontal")}
        ><MdIcon icon="horizontal_distribute" /><span>{$tr("inspector.horizontal")}</span></button>
      <button onclick={() => center("vertical")} title={$tr("params.generic.center.vertical")}
        ><MdIcon icon="vertical_distribute" /><span>{$tr("inspector.vertical")}</span></button>
    </div>
  </div>
  <div class="inspector-subgroup">
    <div class="inspector-subgroup-title">{$tr("inspector.layer")}</div>
    <div class="inspector-segmented inspector-segmented-2">
      <button onclick={() => bringTo("top")}
        ><MdIcon icon="flip_to_front" /><span>{$tr("params.generic.arrange.top")}</span></button>
      <button onclick={() => bringTo("bottom")}
        ><MdIcon icon="flip_to_back" /><span>{$tr("params.generic.arrange.bottom")}</span></button>
    </div>
  </div>
  {#if selectedObject instanceof fabric.FabricImage}
    <div class="inspector-subgroup">
      <div class="inspector-subgroup-title">{$tr("params.generic.fit")}</div>
      <div class="inspector-inline-action">
        <select
          aria-label={$tr("params.generic.fit")}
          value={$appConfig.fitMode ?? "stretch"}
          onchange={(e) =>
            appConfig.update((v) => ({
              ...v,
              fitMode: e.currentTarget.value as "stretch" | "ratio_min" | "ratio_max",
            }))}>
          <option value="stretch">{$tr("params.generic.fit.mode.stretch")}</option><option value="ratio_min"
            >{$tr("params.generic.fit.mode.ratio_min")}</option
          ><option value="ratio_max">{$tr("params.generic.fit.mode.ratio_max")}</option>
        </select>
        <button class="inspector-apply-button" onclick={fit}
          ><MdIcon icon="fit_screen" />{$tr("params.label.apply")}</button>
      </div>
    </div>
  {/if}
</section>
