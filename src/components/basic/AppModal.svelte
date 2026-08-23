<script lang="ts">
  import type { Snippet } from "svelte";
  import * as Dialog from "$/components/ui/dialog/index.js";

  interface Props {
    show: boolean;
    title: string;
    onClose?: () => void;
    children: Snippet;
    footer?: Snippet;
  }

  let { show = $bindable(), title, onClose, children, footer }: Props = $props();

  export const hide = () => {
    show = false;
  };
</script>

<Dialog.Root bind:open={show} onOpenChange={(open) => !open && onClose?.()}>
  <Dialog.Content class="max-w-xl">
    <Dialog.Header>
      <Dialog.Title>{title}</Dialog.Title>
    </Dialog.Header>
    <div class="modal-body">
      {@render children()}
    </div>
    {#if footer}
      <Dialog.Footer>
        {@render footer()}
      </Dialog.Footer>
    {/if}
  </Dialog.Content>
</Dialog.Root>
