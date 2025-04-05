<script lang="ts">
  import { onMount } from 'svelte';
  import { goto } from '$app/navigation';

  onMount(() => {
    goto('/dashboard', { replaceState: true });
  });
</script>

<main class="flex h-screen items-center justify-center">
  <p class="text-gray-600 font-weight-60">Redirecting to Dashboard...</p>
</main>