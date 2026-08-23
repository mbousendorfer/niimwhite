<script lang="ts">
  import { onMount } from "svelte";
  import { OBJECT_DEFAULTS_TEXT } from "$/defaults";
  import { tr } from "$/utils/i18n";
  import { Toasts } from "$/utils/toasts";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { fontCache, userFonts } from "$/stores";
  import FontsMenu from "$/components/designer-controls/FontsMenu.svelte";

  interface Props {
    editRevision?: number;
    value: string;
    valueUpdated: (v: string) => void;
  }

  let { value, valueUpdated, editRevision }: Props = $props();

  let fontQuerySupported = typeof queryLocalFonts !== "undefined";
  let searchString = $state<string>("");

  let systemFontsFiltered = $derived.by<string[]>(() => {
    return $fontCache.filter((e) => e.toLowerCase().includes(searchString.toLowerCase()));
  });

  let userFontsFiltered = $derived.by<string[]>(() => {
    return $userFonts.map((e) => e.family).filter((e) => e.toLowerCase().includes(searchString.toLowerCase()));
  });

  const getSystemFonts = async () => {
    try {
      const fonts = await queryLocalFonts();
      const fontListSorted = [OBJECT_DEFAULTS_TEXT.fontFamily, ...new Set(fonts.map((f: FontData) => f.family))].sort();
      fontCache.update(() => fontListSorted);
      LocalStoragePersistence.saveCachedFonts(fontListSorted);
    } catch (e) {
      Toasts.error(e);
    }
  };

  const fontClick = (family: string) => {
    searchString = "";
    valueUpdated(family);
  };

  onMount(() => {
    try {
      let stored = LocalStoragePersistence.loadCachedFonts();
      if (stored.length > 0) {
        const uniqueFonts = new Set([OBJECT_DEFAULTS_TEXT.fontFamily, ...stored]);
        fontCache.update(() => [...uniqueFonts].sort());
      }
    } catch (e) {
      Toasts.error(e);
    }
  });
</script>

<label class="inspector-field">
  <span>{$tr("params.text.font_family")}</span>
  <div class="font-family-picker">
    <MdIcon icon="text_format" />
    <input type="text" data-ver={editRevision} {value} oninput={(e) => valueUpdated(e.currentTarget.value)} />
    <div class="dropdown">
      <button
        class="font-menu-trigger dropdown-toggle"
        type="button"
        data-dropdown-toggle
        aria-label={$tr("params.text.font_family.search")}><MdIcon icon="expand_more" /></button>
      <div class="dropdown-menu">
        <div class="px-3 py-1">
          <input
            type="text"
            class="form-control form-control-sm"
            placeholder={$tr("params.text.font_family.search")}
            bind:value={searchString} />
        </div>

        {#if userFontsFiltered.length > 0}
          <h6 class="dropdown-header">{$tr("params.text.user_fonts")}</h6>
          {#each userFontsFiltered as family (family)}
            <button class="dropdown-item" style="font-family: {family}" type="button" onclick={() => fontClick(family)}>
              {family}
            </button>
          {/each}
        {/if}

        {#if systemFontsFiltered.length > 0}
          <h6 class="dropdown-header">{$tr("params.text.system_fonts")}</h6>
          {#each systemFontsFiltered as family (family)}
            <button class="dropdown-item" style="font-family: {family}" type="button" onclick={() => fontClick(family)}>
              {family}
            </button>
          {/each}
        {/if}

        {#if fontQuerySupported}
          <div class="dropdown-divider"></div>
          <button class="dropdown-item load-system-fonts" type="button" onclick={getSystemFonts}>
            <MdIcon icon="refresh" />
            {$tr("params.text.fetch_fonts")}
          </button>
        {/if}
      </div>
    </div>
    <FontsMenu />
  </div>
</label>

<style>
  .font-family-picker {
    display: grid;
    grid-template-columns: auto minmax(0, 1fr) auto auto;
    align-items: center;
    min-height: 2.5rem;
    border: 1px solid var(--input);
    border-radius: 0.65rem;
    background: color-mix(in oklch, var(--background) 72%, transparent);
  }
  .font-family-picker > :global(.mdi) {
    margin-inline-start: 0.7rem;
    color: var(--muted-foreground);
  }
  .font-family-picker input {
    min-width: 0;
    height: 2.35rem;
    border: 0;
    padding: 0 0.55rem;
    color: var(--foreground);
    background: transparent;
  }
  .font-menu-trigger {
    width: 2.35rem;
    height: 2.35rem;
    border: 0;
    color: var(--muted-foreground);
    background: transparent;
  }
  .font-menu-trigger::after {
    display: none;
  }

  .dropdown-menu {
    max-height: 240px;
    overflow-y: auto;
  }

  .load-system-fonts {
    color: var(--primary);
  }
</style>
