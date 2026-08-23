<script lang="ts">
  import { QRCode } from "$/fabric-object/qrcode";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  interface Props {
    selectedQRCode: QRCode;
    editRevision: number;
    valueUpdated: () => void;
  }
  let { selectedQRCode, editRevision, valueUpdated }: Props = $props();
</script>

<input type="hidden" value={editRevision} />
<section class="inspector-control-section">
  <header class="inspector-control-heading">
    <div><strong>{$tr("inspector.qrcode")}</strong><span>{$tr("inspector.code.help")}</span></div>
    <MdIcon icon="qr_code_2" />
  </header>
  <label class="inspector-field"
    ><span>{$tr("inspector.content")}</span><textarea
      rows="4"
      value={selectedQRCode.text}
      oninput={(e) => {
        selectedQRCode.set("text", e.currentTarget.value);
        valueUpdated();
      }}></textarea
    ></label>
  <div class="inspector-field-grid inspector-field-grid-2">
    <label class="inspector-field"
      ><span>{$tr("params.qrcode.ecl")}</span><select
        value={selectedQRCode.ecl}
        onchange={(e) => {
          selectedQRCode.set("ecl", e.currentTarget.value);
          valueUpdated();
        }}
        ><option value="L">L · 7%</option><option value="M">M · 15%</option><option value="Q">Q · 25%</option><option
          value="H">H · 30%</option
        ></select
      ></label>
    <label class="inspector-field"
      ><span>{$tr("params.qrcode.mode")}</span><select
        value={selectedQRCode.mode}
        onchange={(e) => {
          selectedQRCode.set("mode", e.currentTarget.value);
          valueUpdated();
        }}
        ><option value="Byte">Byte</option><option value="Numeric">Numeric</option><option value="Alphanumeric"
          >Alphanumeric</option
        ><option value="Kanji">Kanji</option></select
      ></label>
  </div>
  <label class="inspector-field"
    ><span>{$tr("params.qrcode.version")}</span><select
      value={selectedQRCode.qrVersion}
      onchange={(e) => {
        selectedQRCode.set("qrVersion", parseInt(e.currentTarget.value));
        valueUpdated();
      }}
      ><option value={0}>{$tr("inspector.auto")}</option>{#each { length: 40 }, i (i)}<option value={i + 1}
          >{i + 1}</option
        >{/each}</select
    ></label>
</section>
