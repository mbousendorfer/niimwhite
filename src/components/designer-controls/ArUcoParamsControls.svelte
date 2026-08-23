<script lang="ts">
  import { ArUcoMarker, type ArUcoDictionary } from "$/fabric-object/aruco";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { tr } from "$/utils/i18n";
  interface Props {
    selectedArUco: ArUcoMarker;
    editRevision: number;
    valueUpdated: () => void;
  }
  let { selectedArUco, editRevision, valueUpdated }: Props = $props();
  const dictOptions: { value: ArUcoDictionary; label: string; max: number }[] = [
    { value: "4x4", label: "4 × 4 · 50", max: 49 },
    { value: "5x5", label: "5 × 5 · 50", max: 49 },
    { value: "6x6", label: "6 × 6 · 50", max: 49 },
  ];
  let maxId = $derived(dictOptions.find((d) => d.value === selectedArUco.dictionary)?.max ?? 49);
</script>

<input type="hidden" value={editRevision} />
<section class="inspector-control-section">
  <header class="inspector-control-heading">
    <div><strong>{$tr("inspector.aruco")}</strong><span>{$tr("inspector.aruco.help")}</span></div>
    <MdIcon icon="grid_on" />
  </header>
  <label class="inspector-field"
    ><span>{$tr("params.aruco.dict")}</span><select
      value={selectedArUco.dictionary}
      onchange={(e) => {
        selectedArUco.set("dictionary", e.currentTarget.value);
        const newMax = dictOptions.find((d) => d.value === e.currentTarget.value)?.max ?? 49;
        if (selectedArUco.markerId > newMax) selectedArUco.set("markerId", 0);
        valueUpdated();
      }}
      >{#each dictOptions as opt (opt.value)}<option value={opt.value}>{opt.label}</option>{/each}</select
    ></label>
  <label class="inspector-field"
    ><span>{$tr("params.aruco.marker_id")}</span><input
      type="number"
      min="0"
      max={maxId}
      value={selectedArUco.markerId}
      oninput={(e) => {
        const val = parseInt(e.currentTarget.value);
        if (!isNaN(val) && val >= 0 && val <= maxId) {
          selectedArUco.set("markerId", val);
          valueUpdated();
        }
      }} /></label>
</section>
