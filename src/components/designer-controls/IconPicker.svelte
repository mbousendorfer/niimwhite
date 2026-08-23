<script lang="ts">
  import { tr } from "$/utils/i18n";
  import { iconCodepoints, type MaterialIcon } from "$/styles/mdi_icons";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { appConfig, userIcons } from "$/stores";
  import { FileUtils } from "$/utils/file_utils";
  import { Toasts } from "$/utils/toasts";
  import SmilePlusIcon from "@lucide/svelte/icons/smile-plus";
  import { Button } from "$/components/ui/button/index.js";
  import * as Popover from "$/components/ui/popover/index.js";

  interface Props {
    onSubmit: (i: MaterialIcon) => void;
    onSubmitSvg: (i: string) => void;
  }

  let { onSubmit, onSubmitSvg }: Props = $props();

  let iconNames = $state<MaterialIcon[]>([]);
  let search = $state<string>("");
  let deleteMode = $state<boolean>(false);
  let open = $state<boolean>(false);
  let windowWidth = $state<number>(1024);

  const onShow = () => {
    if (iconNames.length === 0) {
      iconNames = Object.keys(iconCodepoints) as MaterialIcon[];
    }
  };

  const addOwn = async () => {
    try {
      let counter = 0;
      const xmls = await FileUtils.pickAndReadTextFile("svg", true);
      const iconsToAdd = xmls.map((xml) => ({
        name: `i_${FileUtils.timestampFloat()}_${counter++}`,
        data: xml,
      }));

      userIcons.update((prev) => [...prev, ...iconsToAdd]);
    } catch (e) {
      Toasts.error(e);
    }
  };

  const svgClicked = (name: string, data: string) => {
    if (deleteMode) {
      userIcons.update((prev) => prev.filter((e) => e.name !== name));
      return;
    }

    onSubmitSvg(data);
    open = false;
  };

  const iconClicked = (i: MaterialIcon) => {
    if (deleteMode) {
      return;
    }

    onSubmit(i);
    open = false;
  };

  $effect(() => {
    if (open) onShow();
  });
</script>

<svelte:window bind:innerWidth={windowWidth} />

<Popover.Root bind:open>
  <Popover.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant="ghost"
        size="icon-lg"
        aria-label={$tr("editor.iconpicker.title")}
        title={$tr("editor.iconpicker.title")}>
        <SmilePlusIcon />
      </Button>
    {/snippet}
  </Popover.Trigger>

  <Popover.Content
    side={windowWidth <= 640 ? "top" : "right"}
    align={windowWidth <= 640 ? "end" : "start"}
    sideOffset={10}
    class="w-[min(28rem,calc(100vw-1rem))] max-h-[min(40rem,calc(100dvh-1rem))] gap-0 overflow-hidden p-0">
    <Popover.Header class="border-b px-3 py-2.5">
      <Popover.Title>{$tr("editor.iconpicker.title")}</Popover.Title>
      <Popover.Description>{$tr("editor.iconpicker.search")}</Popover.Description>
    </Popover.Header>

    <div class="icon-picker-body">
      <input
        disabled={$appConfig.iconListMode === "user"}
        type="text"
        class="form-control mb-1"
        placeholder={$tr("editor.iconpicker.search")}
        bind:value={search} />

      <div class="input-group input-group-sm mb-1">
        <span class="input-group-text">{$tr("editor.iconpicker.show")}</span>
        <select class="form-select form-select-sm" bind:value={$appConfig.iconListMode}>
          <option value="both">{$tr("editor.iconpicker.show.both")}</option>
          <option value="user">{$tr("editor.iconpicker.show.user")}</option>
          <option value="pack">{$tr("editor.iconpicker.show.pack")}</option>
        </select>
      </div>

      <div class="icons mb-1">
        {#if $appConfig.iconListMode === "both" || $appConfig.iconListMode === "user"}
          {#each $userIcons as { name, data } (name)}
            <button
              class="btn {deleteMode ? 'btn-danger' : 'btn-light'} me-1 mb-1 user-icon"
              onclick={() => svgClicked(name, data)}>
              <img src="data:image/svg+xml;base64,{FileUtils.base64str(data)}" alt="user-svg" />
            </button>
          {/each}
        {/if}

        {#if $appConfig.iconListMode === "both" || $appConfig.iconListMode === "pack"}
          {#each iconNames as name (name)}
            {#if !search || name.includes(search.toLowerCase())}
              <button class="btn me-1" title={name} onclick={() => iconClicked(name)}>
                <MdIcon icon={name} />
              </button>
            {/if}
          {/each}
        {/if}
      </div>

      <div class="input-group input-group-sm mb-1">
        <button class="btn btn-outline-secondary" onclick={addOwn}>
          <MdIcon icon="add" />

          {$tr("editor.iconpicker.add")}
        </button>
        <button
          class="btn {deleteMode ? 'btn-danger' : 'btn-outline-secondary'}"
          onclick={() => (deleteMode = !deleteMode)}>
          <MdIcon icon="delete" />
          {$tr("editor.iconpicker.delete_mode")}
        </button>
      </div>

      <a
        href="https://fonts.google.com/icons?icon.set=Material+Icons&icon.style=Filled"
        target="_blank"
        class="text-secondary">
        {$tr("editor.iconpicker.mdi_link_title")}
      </a>
    </div>
  </Popover.Content>
</Popover.Root>

<style>
  .icon-picker-body { min-height: 0; display: flex; flex-direction: column; padding: 0.75rem; }
  .icons {
    min-height: 8rem;
    max-height: min(25rem, calc(100dvh - 16rem));
    overflow-y: auto;
  }
  .user-icon img {
    width: 24px;
  }
</style>
