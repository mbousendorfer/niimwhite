<script lang="ts">
  import * as fabric from "fabric";
  import { tr } from "$/utils/i18n";
  import QRCode from "$/fabric-object/qrcode";
  import Barcode from "$/fabric-object/barcode";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  interface Props {
    selectedObject: fabric.FabricObject;
    valueUpdated: () => void;
  }
  let { selectedObject, valueUpdated }: Props = $props();
  const insertDateTime = (format?: string) => {
    const value = format ? `{dt|${format}}` : "{dt}";
    if (selectedObject instanceof fabric.IText) {
      selectedObject.exitEditing();
      selectedObject.set({ text: `${selectedObject.text}${value}` });
    } else if (selectedObject instanceof QRCode || selectedObject instanceof Barcode)
      selectedObject.set({ text: `${selectedObject.text}${value}` });
    valueUpdated();
  };
</script>

<section class="inspector-control-section inspector-control-section-accent">
  <header class="inspector-control-heading">
    <div><strong>{$tr("params.variables.insert")}</strong><span>{$tr("inspector.variables.help")}</span></div>
    <MdIcon icon="data_object" />
  </header>
  <div class="inspector-variable-grid">
    <button onclick={() => insertDateTime()}
      ><MdIcon icon="event" /><span>{$tr("params.variables.insert.datetime")}</span><code>{"{dt}"}</code></button>
    <button onclick={() => insertDateTime("YYYY-MM-DD")}
      ><MdIcon icon="calendar_today" /><span>{$tr("params.variables.insert.date")}</span><code>{"{dt|YYYY-MM-DD}"}</code
      ></button>
    <button onclick={() => insertDateTime("HH:mm:ss")}
      ><MdIcon icon="schedule" /><span>{$tr("params.variables.insert.time")}</span><code>{"{dt|HH:mm:ss}"}</code
      ></button>
  </div>
</section>
