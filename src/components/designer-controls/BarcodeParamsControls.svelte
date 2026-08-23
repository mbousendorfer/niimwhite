<script lang="ts">
  import { Barcode } from "$/fabric-object/barcode";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  interface Props {
    selectedBarcode: Barcode;
    editRevision: number;
    valueUpdated: () => void;
  }
  let { selectedBarcode, editRevision, valueUpdated }: Props = $props();
</script>

<input type="hidden" value={editRevision} />
<section class="inspector-control-section">
  <header class="inspector-control-heading">
    <div><strong>{$tr("inspector.barcode")}</strong><span>{$tr("inspector.code.help")}</span></div>
    <MdIcon icon="view_week" />
  </header>
  <label class="inspector-field"
    ><span>{$tr("params.barcode.content")}</span><textarea
      rows="4"
      value={selectedBarcode.text}
      oninput={(e) => {
        selectedBarcode.set("text", e.currentTarget.value);
        valueUpdated();
      }}></textarea
    ></label>
  <label class="inspector-field"
    ><span>{$tr("params.barcode.encoding")}</span><select
      value={selectedBarcode.encoding}
      onchange={(e) => {
        selectedBarcode.set("encoding", e.currentTarget.value ?? "EAN13");
        valueUpdated();
      }}><option value="EAN13">EAN 13</option><option value="CODE128B">Code 128 B</option></select
    ></label>
  <div class="inspector-field-grid inspector-field-grid-2">
    <label class="inspector-field"
      ><span>{$tr("params.barcode.scale")}</span><input
        type="number"
        min="1"
        value={selectedBarcode.scaleFactor}
        oninput={(e) => {
          selectedBarcode.set("scaleFactor", e.currentTarget.valueAsNumber || 1);
          valueUpdated();
        }} /></label>
    <label class="inspector-field"
      ><span>{$tr("params.barcode.font_size")}</span>
      <div class="inspector-value">
        <input
          type="number"
          min="1"
          value={selectedBarcode.fontSize}
          oninput={(e) => {
            selectedBarcode.set("fontSize", e.currentTarget.valueAsNumber || 12);
            valueUpdated();
          }} /><small>px</small>
      </div></label>
  </div>
  <label class="inspector-switch-row"
    ><span><strong>{$tr("params.barcode.enable_caption")}</strong><small>{$tr("inspector.caption.help")}</small></span
    ><input
      type="checkbox"
      role="switch"
      checked={selectedBarcode.printText}
      onchange={() => {
        selectedBarcode.set("printText", !selectedBarcode.printText);
        valueUpdated();
      }} /></label>
</section>
