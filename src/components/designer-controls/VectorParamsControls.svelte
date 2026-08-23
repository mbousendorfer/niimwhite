<script lang="ts">
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import * as fabric from "fabric";

  interface Props {
    selectedObject: fabric.FabricObject;
    editRevision: number;
    valueUpdated: () => void;
  }
  let { selectedObject, editRevision, valueUpdated }: Props = $props();
  const roundRadiusChanged = (value: number) => {
    (selectedObject as fabric.Rect).set({ rx: value, ry: value });
    valueUpdated();
  };
  const strokeWidthChanged = (value: number) => {
    selectedObject.set({ strokeWidth: value });
    valueUpdated();
  };
  const fillChanged = (value: string) => {
    selectedObject.set({ fill: value });
    valueUpdated();
  };
</script>

<input type="hidden" value={editRevision} />
{#if selectedObject instanceof fabric.Rect || selectedObject instanceof fabric.Circle || selectedObject instanceof fabric.Line || selectedObject instanceof fabric.Polyline}
  <section class="inspector-control-section">
    <header class="inspector-control-heading">
      <div><strong>{$tr("inspector.appearance")}</strong><span>{$tr("inspector.appearance.help")}</span></div>
      <MdIcon icon="palette" />
    </header>
    <div class="inspector-field-grid {selectedObject instanceof fabric.Rect ? 'inspector-field-grid-2' : ''}">
      {#if selectedObject instanceof fabric.Rect}
        <label class="inspector-field"
          ><span>{$tr("params.vector.round_radius")}</span>
          <div class="inspector-value">
            <input
              type="number"
              min="0"
              max={Math.min(selectedObject.width, selectedObject.height) / 2}
              value={selectedObject.rx}
              oninput={(e) => roundRadiusChanged(e.currentTarget.valueAsNumber)} /><small>px</small>
          </div></label>
      {/if}
      <label class="inspector-field"
        ><span>{$tr("params.vector.stroke_width")}</span>
        <div class="inspector-value">
          <input
            type="number"
            min="1"
            value={selectedObject.strokeWidth}
            oninput={(e) => strokeWidthChanged(e.currentTarget.valueAsNumber)} /><small>px</small>
        </div></label>
    </div>
    {#if selectedObject instanceof fabric.Rect || selectedObject instanceof fabric.Circle}
      <label class="inspector-field"
        ><span>{$tr("params.vector.fill")}</span><select
          value={selectedObject.fill}
          onchange={(e) => fillChanged(e.currentTarget.value)}
          ><option value="transparent">{$tr("params.color.transparent")}</option><option value="white"
            >{$tr("params.color.white")}</option
          ><option value="black">{$tr("params.color.black")}</option></select
        ></label>
    {/if}
  </section>
{/if}
