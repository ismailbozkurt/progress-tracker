// docs/javascript/progress.js

document.addEventListener('DOMContentLoaded', () => {
  const progressContainer = document.getElementById('progress-dashboard-container');
  if (!progressContainer) {
    console.warn("Progress dashboard container not found. Make sure an element with id 'progress-dashboard-container' exists.");
    return;
  }

  // Define the base URL for your MkDocs site.
  // For local development (mkdocs serve), this is usually the current origin.
  // For GitHub Pages, it should be your site_url from mkdocs.yml, e.g., 'https://ismailbozkurt.github.io/progress-tracker/'
  // We'll try to determine it dynamically for flexibility.
  const BASE_URL = window.location.origin + window.location.pathname.split('/')[0]; // Adjust for root or sub-path deployment
  // A more robust way for GitHub Pages would be:
  // const BASE_URL = 'https://ismailbozkurt.github.io/progress-tracker/';
  // Or, if deployed to a subfolder like 'progress-tracker':
  // const BASE_URL = window.location.origin + '/progress-tracker/';
  // For local testing with mkdocs serve, window.location.origin should be sufficient,
  // but if your mkdocs.yml has a `site_dir` or `use_directory_urls` configured,
  // the paths might need to be adjusted. Let's keep it simple for now and rely on relative paths.

  // Define the Markdown files to track.
  // The paths should be relative to the root of your MkDocs site,
  // pointing to the *rendered HTML page* for each Markdown file.
  const filesToTrack = [
    { id: 'project-setup', name: 'Project Setup Tasks', path: 'project_setup/' }, // Removed leading /
    { id: 'frontend', name: 'Frontend Development', path: 'frontend/' },     // Removed leading /
    { id: 'backend', name: 'Backend Development', path: 'backend/' },       // Removed leading /
  ];

  /**
   * Fetches the HTML content of a rendered MkDocs page.
   * @param {string} pagePath - The relative URL path to the rendered HTML page (e.g., 'project_setup/').
   * @returns {Promise<string>} - A promise that resolves with the HTML content.
   */
  async function fetchHtmlContent(pagePath) {
    let htmlContent = '';
    // Construct the full URL
    const fullUrl = new URL(pagePath, window.location.href).href; // Ensures correct relative path resolution
    
    try {
      console.log(`Attempting to fetch HTML from: ${fullUrl}`); // Log the FULL URL being fetched
      const response = await fetch(fullUrl);

      if (!response.ok) {
        console.error(`Fetch failed for ${fullUrl}. Status: ${response.status} - ${response.statusText}`);
        return '';
      }

      htmlContent = await response.text();
      console.log(`Successfully fetched HTML for ${fullUrl}. Content starts with:`, htmlContent.substring(0, 2000) + '...');
      return htmlContent;
    } catch (error) {
      console.error(`Error during fetch operation for ${fullUrl}:`, error);
      return '';
    }
  }

  /**
   * Parses HTML content to count rendered checkboxes and calculate progress.
   * Material for MkDocs often renders task lists as <li> elements with a 'task-list-item' class
   * and uses a 'data-checked' attribute to indicate their state.
   * @param {string} htmlContent - The HTML string to parse.
   * @returns {{completed: number, total: number, percentage: number, progressBarSvg: string}}
   */
  function parseHtmlProgress(htmlContent) {
    if (!htmlContent) {
      console.warn("parseHtmlProgress received empty HTML content.");
      return { completed: 0, total: 0, percentage: 0, progressBarSvg: '' };
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    let contentArea = doc.querySelector('.md-typeset') ||
                      doc.querySelector('article') ||
                      doc.body;

    if (!contentArea) {
      console.warn("Could not find a suitable content area in fetched HTML for checkbox parsing.");
      return { completed: 0, total: 0, percentage: 0, progressBarSvg: '' };
    }

    let totalCheckboxes = 0;
    let completedCheckboxes = 0;

    // Get all list items. We will then filter them for task list items.
    const allListItems = contentArea.querySelectorAll('li');

    allListItems.forEach(item => {
      // Check if this list item is a task list item.
      // Material for MkDocs typically adds 'task-list-item' class or an input checkbox directly.
      const checkboxInput = item.querySelector('input[type="checkbox"]');
      
      if (item.classList.contains('task-list-item') || checkboxInput) {
        totalCheckboxes++; // This is a task item

        // Check for the 'data-checked' attribute, which Material for MkDocs uses
        if (item.getAttribute('data-checked') === 'true') {
          completedCheckboxes++;
        } else if (checkboxInput && checkboxInput.checked) {
          // Fallback: if data-checked isn't present, check the standard checkbox input's 'checked' property
          completedCheckboxes++;
        }
      }
    });

    console.log(`Parsed progress: Total=${totalCheckboxes}, Completed=${completedCheckboxes}`);

    const percentage = totalCheckboxes === 0
      ? 0
      : Math.round((completedCheckboxes / totalCheckboxes) * 100);

    // Generate SVG for the progress bar
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
   * Renders the progress dashboard.
   */
  async function renderProgressDashboard() {
    progressContainer.innerHTML = '<p class="text-center text-gray-500">Loading progress...</p>';
    const allProgressData = [];

    for (const file of filesToTrack) {
      const htmlContent = await fetchHtmlContent(file.path);
      const progress = parseHtmlProgress(htmlContent);
      allProgressData.push({ ...file, ...progress });
    }

    // Clear loading message
    progressContainer.innerHTML = '';

    if (allProgressData.length === 0) {
      progressContainer.innerHTML = '<p class="text-center text-gray-500">No progress data found or failed to load.</p>';
      return;
    }

    // Render each file's progress
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
      progressContainer.appendChild(fileCard);
    });
  }

  // Add Tailwind CSS for styling (if not already included by MkDocs theme)
  const tailwindScript = document.createElement('script');
  tailwindScript.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(tailwindScript);

  // Initial render
  renderProgressDashboard();
});
