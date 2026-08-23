<script lang="ts">
  import type { Component } from "svelte";
  import { Button } from "$/components/ui/button/index.js";
  import * as Tooltip from "$/components/ui/tooltip/index.js";

  interface Props {
    icon: Component;
    label: string;
    active?: boolean;
    disabled?: boolean;
    onclick: () => void;
  }

  let { icon: Icon, label, active = false, disabled = false, onclick }: Props = $props();
</script>

<Tooltip.Root>
  <Tooltip.Trigger>
    {#snippet child({ props })}
      <Button
        {...props}
        variant={active ? "secondary" : "ghost"}
        size="icon-lg"
        aria-label={label}
        aria-pressed={active}
        {disabled}
        {onclick}>
        <Icon />
      </Button>
    {/snippet}
  </Tooltip.Trigger>
  <Tooltip.Content side="right" sideOffset={8}>{label}</Tooltip.Content>
</Tooltip.Root>
