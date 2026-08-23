<script lang="ts">
  import * as fabric from "fabric";
  import { tr } from "$/utils/i18n";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import FontFamilyPicker from "$/components/designer-controls/FontFamilyPicker.svelte";
  import { TextboxExt } from "$/fabric-object/textbox-ext";

  interface Props {
    selectedText: fabric.IText;
    editRevision: number;
    valueUpdated: () => void;
  }
  let { selectedText, editRevision, valueUpdated }: Props = $props();
  const sizeMin = 1;
  const sizeMax = 999;
  const setXAlign = (textAlign: fabric.TOriginX) => {
    selectedText.set({ textAlign });
    valueUpdated();
  };
  const setYAlign = (originY: fabric.TOriginY) => {
    const pos = selectedText.getPointByOrigin("left", "top");
    selectedText.set({ originY });
    selectedText.setPositionByOrigin(pos, "left", "top");
    valueUpdated();
  };
  const toggleBold = () => {
    selectedText.set({ fontWeight: selectedText.fontWeight === "bold" ? "normal" : "bold" });
    valueUpdated();
  };
  const toggleItalic = () => {
    selectedText.set({ fontStyle: selectedText.fontStyle === "italic" ? "normal" : "italic" });
    valueUpdated();
  };
  const toggleFontAutoSize = () => {
    if (selectedText instanceof TextboxExt) selectedText.set({ fontAutoSize: !selectedText.fontAutoSize });
    valueUpdated();
  };
  const fontSizeChange = (value: number) => {
    selectedText.set({ fontSize: isNaN(value) ? 1 : Math.min(Math.max(value, sizeMin), sizeMax) });
    valueUpdated();
  };
  const lineHeightChange = (value: number) => {
    selectedText.set({ lineHeight: isNaN(value) ? 1 : value });
    valueUpdated();
  };
  const splitChanged = (value: string) => {
    if (selectedText instanceof fabric.Textbox) {
      selectedText.set({ splitByGrapheme: value === "grapheme" });
      valueUpdated();
    }
  };
  const fillChanged = (fill: string) => {
    selectedText.set({ fill });
    valueUpdated();
  };
  const backgroundColorChanged = (backgroundColor: string) => {
    selectedText.set({ backgroundColor });
    valueUpdated();
  };
</script>

<input type="hidden" value={editRevision} />

<section class="inspector-control-section">
  <header class="inspector-control-heading">
    <div><strong>{$tr("inspector.content")}</strong><span>{$tr("inspector.content.help")}</span></div>
    <MdIcon icon="edit_note" />
  </header>
  <label class="inspector-field"
    ><span>{$tr("inspector.text")}</span><textarea
      rows="3"
      value={selectedText.text}
      oninput={(e) => {
        selectedText.set({ text: e.currentTarget.value });
        valueUpdated();
      }}></textarea
    ></label>
</section>

<section class="inspector-control-section">
  <header class="inspector-control-heading">
    <div><strong>{$tr("inspector.appearance")}</strong><span>{$tr("inspector.appearance.help")}</span></div>
    <MdIcon icon="palette" />
  </header>
  <div class="inspector-field-grid inspector-field-grid-2">
    <label class="inspector-field"
      ><span>{$tr("inspector.text_color")}</span><select
        value={selectedText.fill}
        onchange={(e) => fillChanged(e.currentTarget.value)}
        ><option value="white">{$tr("params.color.white")}</option><option value="black"
          >{$tr("params.color.black")}</option
        ></select
      ></label>
    <label class="inspector-field"
      ><span>{$tr("inspector.background")}</span><select
        value={selectedText.backgroundColor || "transparent"}
        onchange={(e) => backgroundColorChanged(e.currentTarget.value)}
        ><option value="transparent">{$tr("params.color.transparent")}</option><option value="white"
          >{$tr("params.color.white")}</option
        ><option value="black">{$tr("params.color.black")}</option></select
      ></label>
  </div>
</section>

<section class="inspector-control-section">
  <header class="inspector-control-heading">
    <div><strong>{$tr("inspector.typography")}</strong><span>{$tr("inspector.typography.help")}</span></div>
    <MdIcon icon="text_fields" />
  </header>
  <FontFamilyPicker
    {editRevision}
    value={selectedText.fontFamily}
    valueUpdated={(fontFamily) => {
      selectedText.set({ fontFamily });
      valueUpdated();
    }} />
  <div class="inspector-field-grid inspector-field-grid-2">
    <label class="inspector-field"
      ><span>{$tr("params.text.font_size")}</span>
      <div class="inspector-value">
        <input
          type="number"
          min={sizeMin}
          max={sizeMax}
          step="2"
          value={selectedText.fontSize}
          oninput={(e) => fontSizeChange(e.currentTarget.valueAsNumber)} /><small>px</small>
      </div></label>
    <label class="inspector-field"
      ><span>{$tr("params.text.line_height")}</span><input
        type="number"
        min="0.1"
        step="0.1"
        max="10"
        value={selectedText.lineHeight}
        oninput={(e) => lineHeightChange(e.currentTarget.valueAsNumber)} /></label>
  </div>
  <div class="inspector-subgroup">
    <div class="inspector-subgroup-title">{$tr("inspector.style")}</div>
    <div class="inspector-segmented inspector-segmented-2">
      <button
        class:active={selectedText.fontWeight === "bold"}
        aria-pressed={selectedText.fontWeight === "bold"}
        onclick={toggleBold}><MdIcon icon="format_bold" /><span>{$tr("params.text.bold")}</span></button>
      <button
        class:active={selectedText.fontStyle === "italic"}
        aria-pressed={selectedText.fontStyle === "italic"}
        onclick={toggleItalic}><MdIcon icon="format_italic" /><span>{$tr("params.text.italic")}</span></button>
    </div>
  </div>
  <div class="inspector-subgroup">
    <div class="inspector-subgroup-title">{$tr("inspector.alignment")}</div>
    <div class="inspector-segmented inspector-segmented-3">
      <button
        class:active={selectedText.textAlign === "left"}
        aria-label={$tr("params.text.align.left")}
        aria-pressed={selectedText.textAlign === "left"}
        onclick={() => setXAlign("left")}><MdIcon icon="format_align_left" /></button>
      <button
        class:active={selectedText.textAlign === "center"}
        aria-label={$tr("params.text.align.center")}
        aria-pressed={selectedText.textAlign === "center"}
        onclick={() => setXAlign("center")}><MdIcon icon="format_align_center" /></button>
      <button
        class:active={selectedText.textAlign === "right"}
        aria-label={$tr("params.text.align.right")}
        aria-pressed={selectedText.textAlign === "right"}
        onclick={() => setXAlign("right")}><MdIcon icon="format_align_right" /></button>
    </div>
  </div>
  <div class="inspector-subgroup">
    <div class="inspector-subgroup-title">{$tr("params.text.vorigin")}</div>
    <div class="inspector-segmented inspector-segmented-3">
      <button
        class:active={selectedText.originY === "top"}
        aria-pressed={selectedText.originY === "top"}
        onclick={() => setYAlign("top")}><span>{$tr("params.text.vorigin.top")}</span></button>
      <button
        class:active={selectedText.originY === "center"}
        aria-pressed={selectedText.originY === "center"}
        onclick={() => setYAlign("center")}><span>{$tr("params.text.vorigin.center")}</span></button>
      <button
        class:active={selectedText.originY === "bottom"}
        aria-pressed={selectedText.originY === "bottom"}
        onclick={() => setYAlign("bottom")}><span>{$tr("params.text.vorigin.bottom")}</span></button>
    </div>
  </div>
  {#if selectedText instanceof fabric.Textbox}
    <label class="inspector-field"
      ><span>{$tr("params.params.text.split")}</span><select
        value={selectedText.splitByGrapheme ? "grapheme" : "space"}
        onchange={(e) => splitChanged(e.currentTarget.value)}
        ><option value="space">{$tr("params.params.text.split.spaces")}</option><option value="grapheme"
          >{$tr("params.params.text.split.grapheme")}</option
        ></select
      ></label>
  {/if}
  {#if selectedText instanceof TextboxExt}
    <label class="inspector-switch-row"
      ><span><strong>{$tr("params.text.autosize")}</strong><small>{$tr("inspector.autosize.help")}</small></span><input
        type="checkbox"
        role="switch"
        checked={selectedText.fontAutoSize}
        onchange={toggleFontAutoSize} /></label>
  {/if}
</section>
