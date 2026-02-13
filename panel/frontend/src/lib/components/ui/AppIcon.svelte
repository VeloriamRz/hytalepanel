<script lang="ts">
  import Icon from '@iconify/svelte';

  let {
    name,
    size = 18,
    ariaLabel
  }: {
    name: string;
    size?: number;
    ariaLabel?: string;
  } = $props();
</script>

<span style="display: inline-flex; align-items: center; justify-content: center; line-height: 0;">
  <Icon icon={name} width={size} height={size} aria-label={ariaLabel} aria-hidden={ariaLabel ? undefined : 'true'} />
</span>
