<script lang="ts">
  import { Utils } from "@mmote/niimbluelib";
  import BugIcon from "@lucide/svelte/icons/bug";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import CodeXmlIcon from "@lucide/svelte/icons/code-xml";
  import LanguagesIcon from "@lucide/svelte/icons/languages";
  import BrowserWarning from "$/components/basic/BrowserWarning.svelte";
  import DebugStuff from "$/components/DebugStuff.svelte";
  import LabelDesigner from "$/components/LabelDesigner.svelte";
  import PrinterConnector from "$/components/PrinterConnector.svelte";
  import { Button } from "$/components/ui/button/index.js";
  import * as DropdownMenu from "$/components/ui/dropdown-menu/index.js";
  import { Separator } from "$/components/ui/separator/index.js";
  import { locale, locales, tr } from "$/utils/i18n";

  // eslint-disable-next-line no-undef
  const appCommit = __APP_COMMIT__;
  // eslint-disable-next-line no-undef
  const buildDate = __BUILD_DATE__;

  const isStandalone = Utils.getAvailableTransports().capacitorBle || "__TAURI__" in window;
  let debugStuffShow = $state(false);
</script>

<div class="studio-shell">
  <header class="studio-header studio-surface">
    <a class="brand" href="/" aria-label="NiimBlue Studio">
      <span class="brand-mark" aria-hidden="true">
        <span></span><span></span><span></span>
      </span>
      <span class="brand-name"><span>Niim</span>Blue{isStandalone ? "s" : ""}</span>
      <span class="brand-edition">Studio</span>
    </a>

    <div class="header-center" aria-hidden="true">
      <span class="header-kicker">{$tr("main.workspace")}</span>
      <span class="header-document">{$tr("main.untitled")}</span>
    </div>

    <div class="header-actions">
      <PrinterConnector />

      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button {...props} variant="ghost" size="icon" aria-label={$tr("main.language")}>
              <LanguagesIcon />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" class="w-52">
          <DropdownMenu.Label>{$tr("main.language")}</DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.RadioGroup bind:value={$locale}>
            {#each Object.entries(locales) as [key, name] (key)}
              <DropdownMenu.RadioItem value={key}>{name}</DropdownMenu.RadioItem>
            {/each}
          </DropdownMenu.RadioGroup>
        </DropdownMenu.Content>
      </DropdownMenu.Root>

      <DropdownMenu.Root>
        <DropdownMenu.Trigger>
          {#snippet child({ props })}
            <Button {...props} variant="ghost" size="icon" aria-label={$tr("main.resources")}>
              <ChevronDownIcon />
            </Button>
          {/snippet}
        </DropdownMenu.Trigger>
        <DropdownMenu.Content align="end" class="w-60">
          <DropdownMenu.Label>NiimBlue</DropdownMenu.Label>
          <DropdownMenu.Separator />
          <DropdownMenu.Group>
            <DropdownMenu.Item onclick={() => window.open("https://github.com/MultiMote/niimblue", "_blank")}>
              <CodeXmlIcon />
              {$tr("main.code")}
            </DropdownMenu.Item>
            <DropdownMenu.Item onclick={() => (debugStuffShow = true)}>
              <BugIcon />
              {$tr("main.debug")}
            </DropdownMenu.Item>
          </DropdownMenu.Group>
          <DropdownMenu.Separator />
          <div class="build-meta">
            {#if appCommit}
              <a href="https://github.com/MultiMote/niimblue/commit/{appCommit}">{appCommit.slice(0, 6)}</a>
            {/if}
            <span>{$tr("main.built")} {buildDate}</span>
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </div>
  </header>

  <Separator />

  <main class="studio-main">
    <BrowserWarning />
    <LabelDesigner />
  </main>
</div>

{#if debugStuffShow}
  <DebugStuff bind:show={debugStuffShow} />
{/if}

<style>
  .studio-shell {
    min-height: 100dvh;
    display: grid;
    grid-template-rows: 3.75rem 1px minmax(0, 1fr);
  }

  .studio-header {
    position: relative;
    display: grid;
    grid-template-columns: minmax(12rem, 1fr) auto minmax(12rem, 1fr);
    align-items: center;
    gap: 1rem;
    padding: 0 1rem;
    z-index: 20;
  }

  .brand {
    color: inherit;
    display: inline-flex;
    width: fit-content;
    align-items: center;
    gap: 0.62rem;
    text-decoration: none;
  }

  .brand-mark {
    display: grid;
    grid-template-columns: repeat(3, 0.26rem);
    align-items: end;
    gap: 0.16rem;
    height: 1.2rem;
  }

  .brand-mark span {
    width: 0.26rem;
    border-radius: 999px;
    background: var(--primary);
    box-shadow: 0 0 1.2rem color-mix(in oklch, var(--primary) 42%, transparent);
  }

  .brand-mark span:nth-child(1) { height: 58%; }
  .brand-mark span:nth-child(2) { height: 100%; }
  .brand-mark span:nth-child(3) { height: 76%; }
  .brand-name { font-size: 1.05rem; font-weight: 680; letter-spacing: -0.035em; }
  .brand-name span { color: var(--primary); }

  .brand-edition {
    color: var(--muted-foreground);
    font: 500 0.6rem/1 var(--font-mono);
    letter-spacing: 0.16em;
    text-transform: uppercase;
    transform: translateY(1px);
  }

  .header-center { display: flex; flex-direction: column; align-items: center; line-height: 1.15; }

  .header-kicker {
    color: var(--muted-foreground);
    font: 500 0.58rem/1.2 var(--font-mono);
    letter-spacing: 0.15em;
    text-transform: uppercase;
  }

  .header-document { font-size: 0.78rem; font-weight: 560; }

  .header-actions {
    display: flex;
    min-width: 0;
    align-items: center;
    justify-content: flex-end;
    gap: 0.3rem;
  }

  .studio-main { min-width: 0; min-height: 0; padding: 0.75rem; overflow: hidden; }

  .build-meta {
    display: flex;
    flex-direction: column;
    gap: 0.15rem;
    padding: 0.35rem 0.5rem;
    color: var(--muted-foreground);
    font: 500 0.65rem/1.4 var(--font-mono);
  }

  .build-meta a { color: var(--foreground); }

  @media (max-width: 1100px) {
    .studio-header { grid-template-columns: minmax(0, 1fr) auto; }
    .header-center { display: none; }
  }

  @media (max-width: 760px) {
    .studio-shell { grid-template-rows: 3.5rem 1px minmax(0, 1fr); }
    .studio-header { grid-template-columns: 1fr auto; padding-inline: 0.65rem; }
    .brand-edition { display: none; }
    .studio-main { padding: 0.45rem; }
  }

  @media (max-width: 480px) {
    .studio-header { gap: 0.35rem; padding-inline: 0.5rem; }
    .brand { gap: 0.42rem; }
    .brand-name { font-size: 0.92rem; }
    .header-actions { gap: 0.08rem; }
  }
</style>
