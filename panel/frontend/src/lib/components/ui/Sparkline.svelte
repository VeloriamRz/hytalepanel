<script lang="ts">
  interface Props {
    values: number[];
    stroke?: string;
    fill?: string;
    height?: number;
    min?: number;
    max?: number;
  }

  let { values, stroke = '#d26f7f', fill = 'rgba(210, 111, 127, 0.2)', height = 84, min = 0, max = 100 }: Props =
    $props();

  const width = 260;
  const pad = 6;

  function clamp(value: number, low: number, high: number): number {
    return Math.min(high, Math.max(low, value));
  }

  const safeValues = $derived(values.length > 0 ? values : [0]);
  const calculatedMax = $derived(max > min ? max : min + 1);

  const points = $derived.by(() => {
    const size = safeValues.length;
    if (size === 1) {
      const y = height - pad - ((clamp(safeValues[0], min, calculatedMax) - min) / (calculatedMax - min)) * (height - pad * 2);
      return `${pad},${y} ${width - pad},${y}`;
    }

    return safeValues
      .map((value, index) => {
        const x = pad + (index / (size - 1)) * (width - pad * 2);
        const y =
          height -
          pad -
          ((clamp(value, min, calculatedMax) - min) / (calculatedMax - min)) * (height - pad * 2);
        return `${x},${y}`;
      })
      .join(' ');
  });

  const fillPoints = $derived.by(() => `${points} ${width - pad},${height - pad} ${pad},${height - pad}`);
</script>

<svg class="sparkline" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="hardware sparkline">
  <polyline class="sparkline-fill" points={fillPoints} style={`fill:${fill};`} />
  <polyline class="sparkline-line" points={points} style={`stroke:${stroke};`} />
</svg>

<style>
  .sparkline {
    width: 100%;
    height: 84px;
    display: block;
  }

  .sparkline-fill {
    stroke: none;
  }

  .sparkline-line {
    fill: none;
    stroke-width: 2.2;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
</style>
