<script lang="ts">
	import { page } from '$app/stores';
	import { writable } from 'svelte/store';
	import '../app.css'; // Import Tailwind CSS
  
	const sidebarOpen = writable(true);
  
	function toggleSidebar() {
	  $sidebarOpen = !$sidebarOpen;
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
				<span class="mx-auto text-xl font-bold">D</span>
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
				<span class="mx-auto text-xl font-bold">S</span>
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