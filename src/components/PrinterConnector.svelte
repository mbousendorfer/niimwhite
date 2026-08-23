<script lang="ts">
  import { NiimbotCapacitorBleClient, SoundSettingsItemType, Utils, type AvailableTransports } from "@mmote/niimbluelib";
  import BluetoothIcon from "@lucide/svelte/icons/bluetooth";
  import ChevronDownIcon from "@lucide/svelte/icons/chevron-down";
  import LoaderCircleIcon from "@lucide/svelte/icons/loader-circle";
  import PowerIcon from "@lucide/svelte/icons/power";
  import PowerOffIcon from "@lucide/svelte/icons/power-off";
  import Settings2Icon from "@lucide/svelte/icons/settings-2";
  import UsbIcon from "@lucide/svelte/icons/usb";
  import type { MaterialIcon } from "material-icons";
  import { onMount } from "svelte";
  import FirmwareUpdater from "$/components/basic/FirmwareUpdater.svelte";
  import MdIcon from "$/components/basic/MdIcon.svelte";
  import { Badge } from "$/components/ui/badge/index.js";
  import { Button } from "$/components/ui/button/index.js";
  import * as DropdownMenu from "$/components/ui/dropdown-menu/index.js";
  import * as Popover from "$/components/ui/popover/index.js";
  import { Separator } from "$/components/ui/separator/index.js";
  import {
    automation,
    connectedPrinterName,
    connectionState,
    heartbeatData,
    heartbeatFails,
    initClient,
    printerClient,
    printerInfo,
    printerMeta,
    refreshRfidInfo,
    rfidInfo,
    ribbonRfidInfo,
  } from "$/stores";
  import type { ConnectionType } from "$/types";
  import { tr } from "$/utils/i18n";
  import { LocalStoragePersistence } from "$/utils/persistence";
  import { Toasts } from "$/utils/toasts";

  let connectionType = $state<ConnectionType>("bluetooth");
  let featureSupport = $state<AvailableTransports>({ webBluetooth: false, webSerial: false, capacitorBle: false });

  const onConnectClicked = async () => {
    initClient(connectionType);
    connectionState.set("connecting");
    try {
      if ($printerClient instanceof NiimbotCapacitorBleClient && $automation?.autoConnectDeviceId !== undefined) {
        await $printerClient.connect({ deviceId: $automation.autoConnectDeviceId });
      } else {
        await $printerClient.connect();
      }
    } catch (e) {
      connectionState.set("disconnected");
      Toasts.error(e);
    }
  };

  const onDisconnectClicked = () => $printerClient.disconnect();
  const startHeartbeat = async () => $printerClient.startHeartbeat();
  const stopHeartbeat = async () => $printerClient.stopHeartbeat();

  const soundOn = async () => {
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.BluetoothConnectionSound, true);
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.PowerSound, true);
  };

  const soundOff = async () => {
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.BluetoothConnectionSound, false);
    await $printerClient.abstraction.setSoundEnabled(SoundSettingsItemType.PowerSound, false);
  };

  const fetchInfo = async () => $printerClient.fetchPrinterInfo();
  const reset = async () => $printerClient.abstraction.printerReset();

  const switchConnectionType = (type: ConnectionType) => {
    LocalStoragePersistence.saveLastConnectionType(type);
    connectionType = type;
  };

  const connectionLabel = () => {
    if (connectionType === "serial") return $tr("connector.serial");
    if (connectionType === "capacitor-ble") return "Capacitor BLE";
    return $tr("connector.bluetooth");
  };

  const batteryIcon = (value: number): MaterialIcon => {
    if (value > 4) value = Math.min(4, Math.max(1, Math.ceil(value / 25)));
    if (value === 4) return "battery_full";
    if (value === 3) return "battery_5_bar";
    if (value === 2) return "battery_3_bar";
    if (value === 1) return "battery_2_bar";
    return "battery_0_bar";
  };

  onMount(() => {
    featureSupport = Utils.getAvailableTransports();
    connectionType = LocalStoragePersistence.loadLastConnectionType() ?? "bluetooth";
    if (!featureSupport.capacitorBle && connectionType === "capacitor-ble") connectionType = "bluetooth";
    if (!featureSupport.webSerial && connectionType === "serial") connectionType = "bluetooth";
    if (!featureSupport.webBluetooth && connectionType === "bluetooth" && featureSupport.capacitorBle) connectionType = "capacitor-ble";
    if ($automation !== undefined && $automation.autoConnect && connectionType === "capacitor-ble") onConnectClicked();
  });
</script>

<div class="printer-connector">
  {#if $connectionState === "connected"}
    <Popover.Root>
      <Popover.Trigger>
        {#snippet child({ props })}
          <Button {...props} variant="outline" size="sm" class="printer-chip" aria-label={$tr("connector.details")}>
            <span class:warning={$heartbeatFails > 0} class="connection-dot"></span>
            <span class="printer-name">{$printerMeta?.model ?? $connectedPrinterName}</span>
            {#if $heartbeatData?.chargeLevel}
              <span class="battery"><MdIcon icon={batteryIcon($heartbeatData.chargeLevel)} class="r-90" /></span>
            {/if}
            <ChevronDownIcon />
          </Button>
        {/snippet}
      </Popover.Trigger>
      <Popover.Content align="end" class="printer-popover">
        <Popover.Header>
          <Popover.Title>{$printerMeta?.model ?? $connectedPrinterName}</Popover.Title>
          <Popover.Description>{$tr("connector.connected")}</Popover.Description>
        </Popover.Header>
        <div class="connection-overview">
          <Badge variant="secondary">
            {#if connectionType === "serial"}<UsbIcon />{:else}<BluetoothIcon />{/if}
            {connectionLabel()}
          </Badge>
          {#if $heartbeatData?.chargeLevel}<span class="metric">{$heartbeatData.chargeLevel}%</span>{/if}
        </div>
        <Separator />

        <div class="details-list">
          {#if $printerInfo}
            <details open>
              <summary>{$tr("connector.printer_info")}</summary>
              <dl>{#each Object.entries($printerInfo) as [key, value] (key)}<dt>{key}</dt><dd>{value ?? "–"}</dd>{/each}</dl>
            </details>
          {/if}
          {#if $printerMeta}
            <details>
              <summary>{$tr("connector.model_info")}</summary>
              <dl>{#each Object.entries($printerMeta) as [key, value] (key)}<dt>{key}</dt><dd>{value ?? "–"}</dd>{/each}</dl>
            </details>
          {/if}
          {#if $rfidInfo || $ribbonRfidInfo}
            <details>
              <summary>RFID</summary>
              <Button variant="outline" size="xs" onclick={refreshRfidInfo}>{$tr("connector.refresh")}</Button>
              {#if $rfidInfo}<dl>{#each Object.entries($rfidInfo) as [key, value] (key)}<dt>{key}</dt><dd>{value ?? "–"}</dd>{/each}</dl>{/if}
              {#if $ribbonRfidInfo}<dl>{#each Object.entries($ribbonRfidInfo) as [key, value] (key)}<dt>{key}</dt><dd>{value ?? "–"}</dd>{/each}</dl>{/if}
            </details>
          {/if}
          {#if $heartbeatData}
            <details>
              <summary>Heartbeat</summary>
              <dl>{#each Object.entries($heartbeatData) as [key, value] (key)}<dt>{key}</dt><dd>{value ?? "–"}</dd>{/each}</dl>
            </details>
          {/if}
          <details>
            <summary>{$tr("connector.advanced")}</summary>
            <div class="advanced-actions">
              <Button variant="outline" size="xs" onclick={startHeartbeat}>Heartbeat on</Button>
              <Button variant="outline" size="xs" onclick={stopHeartbeat}>Heartbeat off</Button>
              <Button variant="outline" size="xs" onclick={soundOn}>Sound on</Button>
              <Button variant="outline" size="xs" onclick={soundOff}>Sound off</Button>
              <Button variant="outline" size="xs" onclick={fetchInfo}>Refresh info</Button>
              <Button variant="destructive" size="xs" onclick={reset}>Reset</Button>
            </div>
            <FirmwareUpdater />
          </details>
        </div>
      </Popover.Content>
    </Popover.Root>

    <Button variant="ghost" size="icon" onclick={onDisconnectClicked} aria-label={$tr("connector.disconnect")}>
      <PowerOffIcon />
    </Button>
  {:else}
    <DropdownMenu.Root>
      <DropdownMenu.Trigger disabled={$connectionState === "connecting"}>
        {#snippet child({ props })}
          <Button {...props} variant="outline" size="sm" class="transport-trigger">
            {#if connectionType === "serial"}<UsbIcon data-icon="inline-start" />{:else}<BluetoothIcon data-icon="inline-start" />{/if}
            <span class="connector-label">{connectionLabel()}</span>
            <ChevronDownIcon data-icon="inline-end" />
          </Button>
        {/snippet}
      </DropdownMenu.Trigger>
      <DropdownMenu.Content align="end" class="w-52">
        <DropdownMenu.Label>{$tr("connector.transport")}</DropdownMenu.Label>
        <DropdownMenu.Separator />
        <DropdownMenu.RadioGroup value={connectionType} onValueChange={(value) => switchConnectionType(value as ConnectionType)}>
          {#if featureSupport.webBluetooth}<DropdownMenu.RadioItem value="bluetooth"><BluetoothIcon />{$tr("connector.bluetooth")}</DropdownMenu.RadioItem>{/if}
          {#if featureSupport.webSerial}<DropdownMenu.RadioItem value="serial"><UsbIcon />{$tr("connector.serial")}</DropdownMenu.RadioItem>{/if}
          {#if featureSupport.capacitorBle}<DropdownMenu.RadioItem value="capacitor-ble"><BluetoothIcon />Capacitor BLE</DropdownMenu.RadioItem>{/if}
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Root>

    <Button
      size="sm"
      disabled={$connectionState === "connecting" || (!featureSupport.capacitorBle && !featureSupport.webBluetooth && !featureSupport.webSerial)}
      onclick={onConnectClicked}>
      {#if $connectionState === "connecting"}<LoaderCircleIcon class="spin" />{:else}<PowerIcon data-icon="inline-start" />{/if}
      <span class="connector-label">{$connectionState === "connecting" ? $tr("connector.connecting") : $tr("connector.connect")}</span>
    </Button>
  {/if}
</div>

<style>
  .printer-connector { display: flex; min-width: 0; align-items: center; gap: 0.25rem; }
  :global(.printer-chip) { max-width: 14rem; }
  .printer-name { max-width: 7.5rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .connection-dot { width: 0.4rem; height: 0.4rem; flex: none; border-radius: 50%; background: var(--success); box-shadow: 0 0 0.65rem color-mix(in oklch, var(--success) 75%, transparent); }
  .connection-dot.warning { background: var(--warning); box-shadow: 0 0 0.65rem color-mix(in oklch, var(--warning) 75%, transparent); }
  .battery { color: var(--muted-foreground); }
  :global(.printer-popover) { width: min(92vw, 23rem); max-height: min(78vh, 42rem); overflow: auto; }
  .connection-overview { display: flex; align-items: center; justify-content: space-between; gap: 1rem; }
  .details-list { display: flex; flex-direction: column; gap: 0.2rem; }
  details { border-bottom: 1px solid var(--border); padding: 0.3rem 0; }
  details:last-child { border: 0; }
  summary { padding: 0.35rem 0.15rem; cursor: pointer; font-size: 0.72rem; font-weight: 650; }
  dl { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 0.22rem 0.75rem; margin: 0.35rem 0; padding: 0.5rem; border-radius: var(--radius-md); background: var(--muted); font: 500 0.62rem/1.35 var(--font-mono); }
  dt { min-width: 0; color: var(--muted-foreground); overflow-wrap: anywhere; }
  dd { margin: 0; text-align: right; overflow-wrap: anywhere; }
  .advanced-actions { display: flex; flex-wrap: wrap; gap: 0.3rem; padding: 0.4rem 0; }
  :global(.spin) { animation: spin 0.8s linear infinite; }
  @keyframes spin { to { transform: rotate(360deg); } }
</style>
