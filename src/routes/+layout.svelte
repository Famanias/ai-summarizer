<script lang="ts">
	import { page } from '$app/stores';
	import { writable } from 'svelte/store';
	import '../app.css'; // Import Tailwind CSS
	import { databaseUploaded } from '$lib/index';
  
	const sidebarOpen = writable(true);
    let fileError: string | null = null;
	let isLoading = false;
	const MAX_FILE_SIZE = 20 * 1024 * 1024;

	function toggleSidebar() {
	  $sidebarOpen = !$sidebarOpen;
	}

 	async function uploadFile(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		const file = input.files[0];
		isLoading = true;
		fileError = null;

		try {
		const formData = new FormData();
		formData.append('dbFile', file);

		const response = await fetch('/api/upload', {
			method: 'POST',
			body: formData
		});

		if (!response.ok) {
			const errorText = await response.text();
			throw new Error(errorText || 'Upload failed');
		}

		$databaseUploaded = !$databaseUploaded;
		} catch (err) {
		fileError = err instanceof Error ? err.message : "Upload failed";
		setTimeout(() => fileError = null, 5000);
		} finally {
		isLoading = false;
		input.value = ''; // Reset input
		}
	}
</script>

<div class="flex h-screen bg-gray-50 text-gray-900">
	<!-- Sidebar -->
	<aside class="bg-gray-900 text-white {$sidebarOpen ? 'w-64' : 'w-16'} flex flex-col transition-all duration-300">
	  <div class="p-4 flex items-center justify-between border-b border-gray-800">
		{#if $sidebarOpen}
		  <h1 class="text-xl font-bold">DB Summarizer</h1>
		{:else}
		  <span class="mx-auto text-xl font-bold">DB</span>
		{/if}
		<button class="text-gray-400 hover:text-white" on:click={toggleSidebar}>
		  {#if $sidebarOpen}
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7" />
			</svg>
		  {:else}
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
			</svg>
		  {/if}
		</button>
	  </div>

	  <!-- Database Import Section -->
	{#if $sidebarOpen}
	<div class="p-4 border-b border-gray-800">
		<label class="block text-sm font-medium text-gray-300 mb-2">Import Database</label>
		<div class="relative group">
		  <div class="border-2 border-dashed border-gray-600 rounded-lg p-4 text-center
					group-hover:border-blue-400 transition-colors cursor-pointer
					{isLoading ? 'opacity-50 pointer-events-none' : ''}">
			<input
			  type="file"
			  accept=".db"
			  on:change={uploadFile}
			  class="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
			  disabled={isLoading}
			/>
			{#if isLoading}
			  <div class="flex flex-col items-center justify-center">
				<svg class="animate-spin h-8 w-8 text-white mb-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
				  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
				  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
				</svg>
				<span class="text-sm text-gray-300">Uploading...</span>
			  </div>
			{:else}
			  <svg class="mx-auto h-10 w-10 text-gray-400 group-hover:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
			  </svg>
			  <p class="mt-2 text-sm text-gray-400 group-hover:text-blue-300">
				Drag and drop or <span class="font-medium">browse files</span>
			  </p>
			  <p class="text-xs text-gray-500 mt-1">.db files only, max 20MB</p>
			{/if}
		  </div>
		</div>

		{#if fileError}
		  <div class="mt-2 p-2 text-sm text-red-400 bg-red-900/20 rounded">{fileError}</div>
		{/if}
	</div>
	  {:else}
	  <div class="p-4 border-b border-gray-800 flex justify-center">
		<label title="Import Database" class="cursor-pointer">
		  <svg class="w-6 h-6 text-gray-400 hover:text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"></path>
		  </svg>
		  <input type="file" name="dbFile" accept=".db" class="hidden" on:change={(e) => {
			if (e.target.files.length > 0) {
			  const form = document.createElement('form');
			  form.enctype = 'multipart/form-data';
			  const fd = new FormData(form);
			  fd.append('dbFile', e.target.files[0]);
			  uploadFile({ target: form, preventDefault: () => {} } as unknown as Event);
			}
		  }}/>
		</label>
	  </div>
	  {/if}
  
	  <nav class="flex-1 py-4">
		<ul>
		  <li>
			<a
			  href="/dashboard"
			  class="w-full flex items-center px-4 py-3 {$page.url.pathname === '/dashboard' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}"
			>
			  {#if $sidebarOpen}
				<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				  <path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
				  />
				</svg>
				<span>Dashboard</span>
			  {:else}
				<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
					/>
				</svg>
			  {/if}
			</a>
		  </li>
		  <li>
			<a
			  href="/summaries"
			  class="w-full flex items-center px-4 py-3 {$page.url.pathname === '/summaries' ? 'bg-gray-800 text-white' : 'text-gray-400 hover:bg-gray-800 hover:text-white'}"
			>
			  {#if $sidebarOpen}
				<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
				  <path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
				  />
				</svg>
				<span>Summaries</span>
			  {:else}
				<svg class="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
					<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
					/>
				</svg>
			  {/if}
			</a>
		  </li>
		</ul>
	  </nav>
	</aside>
  
	<!-- Main Content -->
	<div class="flex-1 flex flex-col overflow-hidden">
	  <slot />
	</div>
  </div>

<style>
	.btn {
		@apply transition-colors duration-200;
	}
</style>