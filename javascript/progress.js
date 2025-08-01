// docs/javascript/progress.js

document.addEventListener('DOMContentLoaded', () => {
  const progressDashboardContainer = document.getElementById('progress-dashboard-container');

  // If the main dashboard container is not found, this script should not run on the page.
  // This script is specifically intended for index.md.
  if (!progressDashboardContainer) {
    console.log("Progress dashboard container not found on this page. This script is intended for index.md.");
    return;
  }

  // Dynamically define the base path of your MkDocs site.
  // This is essential for constructing URLs to fetch other pages.
  const getBasePath = () => {
    const path = window.location.pathname;
    // If the path starts with '/progress-tracker/', it's our base path.
    if (path.startsWith('/progress-tracker/')) {
      return '/progress-tracker/';
    }
    return '/'; // Default fallback for local root directory presentation
  };
  const SITE_BASE_PATH = getBasePath();

  // Define the project pages to track.
  // This array will now be populated dynamically from search_index.json
  let filesToTrack = [];

  /**
   * Fetches the HTML content of a generated MkDocs page.
   * @param {string} pagePath - Relative URL path to the generated HTML page (e.g., 'project_setup/').
   * @returns {Promise<string>} - A Promise that resolves with the file content.
   */
  async function fetchHtmlContent(pagePath) {
    // MkDocs typically converts 'file.md' to 'file/' if use_directory_urls is true
    // Or 'file.html' if use_directory_urls is false.
    // The doc.location from search_index.json usually gives the correct relative path.
    const fullUrl = window.location.origin + SITE_BASE_PATH + pagePath;
    try {
      console.log(`[progress.js] Attempting to fetch HTML for: ${fullUrl}`);
      const response = await fetch(fullUrl);

      if (!response.ok) {
        console.error(`[progress.js] Fetch failed for ${fullUrl}. Status: ${response.status} - ${response.statusText}`);
        return '';
      }
      const htmlContent = await response.text();
      console.log(`[progress.js] Successfully fetched HTML for ${fullUrl}. Content starts with:`, htmlContent.substring(0, 500) + '...');
      return htmlContent;
    } catch (error) {
      console.error(`[progress.js] Error during fetch operation for ${fullUrl}:`, error);
      return '';
    }
  }

  /**
   * Parses the fetched HTML content to count checked checkboxes and calculate progress.
   * This targets <li class="task-list-item"> elements and the nested checkbox's 'checked' property.
   * @param {string} htmlContent - HTML string to be parsed.
   * @returns {{completed: number, total: number, percentage: number, progressBarSvg: string}}
   */
  function parseHtmlProgress(htmlContent) {
    if (!htmlContent) {
      console.warn("[progress.js] parseHtmlProgress received empty HTML content.");
      return { completed: 0, total: 0, percentage: 0, progressBarSvg: '' };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    let totalCheckboxes = 0;
    let completedCheckboxes = 0;

    // Target all <li> elements with class 'task-list-item' as seen in HTML.
    const taskListItems = doc.querySelectorAll('li.task-list-item');

    taskListItems.forEach(item => {
      const checkboxInput = item.querySelector('input[type="checkbox"]');

      // Only count items that actually include a checkbox
      if (checkboxInput) {
        totalCheckboxes++;

        // Use the 'checked' property to determine if it's marked
        const isChecked = checkboxInput.checked;

        if (isChecked) {
          completedCheckboxes++;
        }
      }
    });

    console.log(`[progress.js] Parsed progress: Total=${totalCheckboxes}, Completed=${completedCheckboxes}`);

    const percentage = totalCheckboxes === 0
      ? 0
      : Math.round((completedCheckboxes / totalCheckboxes) * 100);

    // Generate an SVG progress bar
    const progressBarSvg = `
      <svg width="100%" height="20" class="rounded-full bg-gray-200">
        <rect width="${percentage}%" height="20" fill="#4CAF50" class="rounded-full"></rect>
        <text x="50%" y="15" fill="black" text-anchor="middle" font-size="12" font-weight="bold">${percentage}%</text>
      </svg>
    `;

    return {
      completed: completedCheckboxes,
      total: totalCheckboxes,
      percentage,
      progressBarSvg,
    };
  }

  /**
   * Fetches the MkDocs search index and dynamically populates filesToTrack.
   * This is crucial for detecting new Markdown files.
   */
  async function populateFilesToTrack() {
    const searchIndexUrl = window.location.origin + SITE_BASE_PATH + 'search/search_index.json';
    try {
      console.log(`[progress.js] Attempting to fetch search index: ${searchIndexUrl}`);
      const response = await fetch(searchIndexUrl);
      if (!response.ok) {
        console.error(`[progress.js] Failed to fetch search index. Status: ${response.status} - ${response.statusText}. Ensure search plugin is enabled and MkDocs is built.`);
        // Fallback or display error message on dashboard if fetch fails
        progressDashboardContainer.innerHTML = `<p class="text-center text-red-500">Error loading progress: Could not fetch search index. Please check console for details.</p>`;
        return;
      }
      const searchIndex = await response.json();
      console.log("[progress.js] Search index fetched:", searchIndex);

      // Filter pages that are directly under the 'docs' root
      // and are not the 'index.md' (dashboard) page itself.
      filesToTrack = searchIndex.docs
        .filter(doc => {
          // Exclude the dashboard page itself (index.md is usually 'index/' or 'index.html' in location)
          if (doc.location === 'index/' || doc.location === 'index.md' || doc.location === 'index.html') {
            return false;
          }

          // Check if the page is a top-level HTML page.
          // This means its 'location' path should not contain any internal slashes (e.g., 'about/', 'contact.html')
          // but should not be something like 'sub/page/'
          const isTopLevelPage = !doc.location.includes('/') || (doc.location.endsWith('/') && doc.location.split('/').length <= 2);

          return isTopLevelPage;
        })
        .map(doc => {
          // Determine a user-friendly name. Prefer 'title' from search index.
          // If title is missing, try to derive from location (e.g., 'newtask/' -> 'Newtask')
          let name = doc.title;
          if (!name) {
            name = doc.location.replace(/\.md$/, '').replace(/\.html$/, '').replace(/\/$/, ''); // Remove .md, .html, or trailing /
            name = name.split('/').pop(); // Get just the last part of the path
            name = name.replace(/_/g, ' '); // Replace underscores with spaces
            name = name.charAt(0).toUpperCase() + name.slice(1); // Capitalize first letter
          }

          return {
            id: doc.location.replace(/\//g, '-').replace(/\.md$/, '').replace(/\.html$/, ''), // Create a unique ID
            name: name,
            path: doc.location, // The path from search index is usually correct for fetching
          };
        });

      // Sort files to track alphabetically by name for consistent display
      filesToTrack.sort((a, b) => a.name.localeCompare(b.name));

      console.log("[progress.js] Dynamically populated filesToTrack:", filesToTrack);

    } catch (error) {
      console.error(`[progress.js] Error fetching or parsing search index:`, error);
      progressDashboardContainer.innerHTML = `<p class="text-center text-red-500">Error loading progress: Failed to parse search index data. Check console.</p>`;
    }
  }

  /**
   * Builds the consolidated progress dashboard on the index page.
   */
  async function renderConsolidatedDashboard() {
    progressDashboardContainer.innerHTML = '<p class="text-center text-gray-500">Loading task progress...</p>';

    // First, populate filesToTrack dynamically
    await populateFilesToTrack();

    const allProgressData = [];

    // Only proceed if filesToTrack was successfully populated
    if (filesToTrack.length === 0) {
      progressDashboardContainer.innerHTML = '<p class="text-center text-gray-500">No other tracked pages found (excluding this dashboard page). Ensure your Markdown files are in the `docs/` root and listed in `mkdocs.yml` nav.</p>';
      return;
    }

    // Process each dynamically found file
    for (const file of filesToTrack) {
      const htmlContent = await fetchHtmlContent(file.path);
      const progress = parseHtmlProgress(htmlContent);
      allProgressData.push({ ...file, ...progress });
    }

    // Clear loading message
    progressDashboardContainer.innerHTML = '';

    if (allProgressData.length === 0) {
      progressDashboardContainer.innerHTML = '<p class="text-center text-gray-500">No progress data found or failed to load for tracked pages.</p>';
      return;
    }

    // Create progress card for each file
    allProgressData.forEach(data => {
      const fileCard = document.createElement('div');
      fileCard.className = 'border border-gray-200 rounded-lg p-4 bg-white shadow-sm mb-4';
      fileCard.innerHTML = `
        <h2 class="text-xl font-semibold text-gray-700 mb-2">${data.name}</h2>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-600">
            ${data.completed} / ${data.total} tasks completed
          </span>
          <span class="text-sm font-medium text-gray-800">${data.percentage}%</span>
        </div>
        ${data.progressBarSvg}
      `;
      progressDashboardContainer.appendChild(fileCard);
    });
  }

  // Inject Tailwind CSS for styling (if not already included by the MkDocs theme)
  // This might be redundant if your theme already includes Tailwind or you pre-compile it.
  // Consider removing if you encounter issues or it's not needed.
  const tailwindScript = document.createElement('script');
  tailwindScript.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(tailwindScript);

  // Render the consolidated progress dashboard
  renderConsolidatedDashboard();
});