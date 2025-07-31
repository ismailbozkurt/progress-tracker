// docs/javascript/individual-progress.js

document.addEventListener('DOMContentLoaded', () => {
  // This script is designed for individual project pages on an MkDocs site.
  // Its purpose is to display progress based on task lists within each page.

  // Prevent the script from running on index.md.
  // The index.md page contains a div with ID 'progress-dashboard-container'.
  // If this ID is found on the page, stop the script.
  if (document.getElementById('progress-dashboard-container')) {
    console.log("[individual-progress.js] This is index.md. Script will not run on this page.");
    return; // Exit the script
  }

  // Find the container element where the progress bar should be placed.
  // This should be a <div id="current-page-progress-bar"></div> appended to each Markdown file.
  let progressBarContainer = document.getElementById('current-page-progress-bar');

  // If the specified container is not found (not added by user or wrong ID),
  // try appending the progress bar to the main content area as a fallback.
  if (!progressBarContainer) {
    const mainContent = document.querySelector('[role="main"]') || // Main content region
                        document.querySelector('.md-content__inner') || // Material for MkDocs inner content
                        document.querySelector('.md-typeset') || // Typography container
                        document.querySelector('article') || // Article content
                        document.body; // Fallback to document body

    if (mainContent) {
      progressBarContainer = document.createElement('div');
      progressBarContainer.id = 'current-page-progress-bar'; // Assign new ID
      mainContent.appendChild(progressBarContainer); // Append to main content
      console.log("[individual-progress.js] Fallback 'current-page-progress-bar' div created and appended.");
    } else {
      console.warn("[individual-progress.js] No suitable container found for progress bar. Aborting.");
      return; // Exit if no place to insert progress bar
    }
  }

  /**
   * Parses the current page HTML to count checked task checkboxes and calculate progress.
   * Material for MkDocs generates Markdown task lists using <li class="task-list-item"> elements
   * which contain an <input type="checkbox"> inside.
   * @returns {{completed: number, total: number, percentage: number, progressBarSvg: string}}
   */
  function parseCurrentPageProgress() {
    let totalCheckboxes = 0;
    let completedCheckboxes = 0;

    // Select all <li> elements with class 'task-list-item'
    // This is how Material for MkDocs renders task lists.
    const taskListItems = document.querySelectorAll('li.task-list-item');

    taskListItems.forEach(item => {
      // Look for a checkbox input inside each task list item
      const checkboxInput = item.querySelector('input[type="checkbox"]');

      // Count as task only if checkbox exists and is not part of UI controls (like TOC, drawer, search)
      if (checkboxInput &&
          checkboxInput.id !== '__toc' &&
          checkboxInput.id !== '__drawer' &&
          checkboxInput.id !== '__search'
      ) {
        totalCheckboxes++;

        // Check if checkbox is marked as checked
        const isChecked = checkboxInput.checked;

        if (isChecked) {
          completedCheckboxes++;
        }
      }
    });

    console.log(`[individual-progress.js] Page progress: Total=${totalCheckboxes}, Completed=${completedCheckboxes}`);

    // Calculate percentage progress. If no tasks, default to 0%.
    const percentage = totalCheckboxes === 0
      ? 0
      : Math.round((completedCheckboxes / totalCheckboxes) * 100);

    // Generate SVG progress bar using Tailwind CSS classes.
    const progressBarSvg = `
      <div class="mt-8 p-4 border border-gray-200 rounded-lg bg-white shadow-sm">
        <h3 class="text-lg font-semibold text-gray-700 mb-2">Page Progress</h3>
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm text-gray-600">
            ${completedCheckboxes} / ${totalCheckboxes} tasks completed
          </span>
          <span class="text-sm font-medium text-gray-800">${percentage}%</span>
        </div>
        <svg width="100%" height="20" class="rounded-full bg-gray-200">
          <rect width="${percentage}%" height="20" fill="#4CAF50" class="rounded-full"></rect>
          <text x="50%" y="15" fill="black" text-anchor="middle" font-size="12" font-weight="bold">${percentage}%</text>
        </svg>
      </div>
    `;

    return {
      completed: completedCheckboxes,
      total: totalCheckboxes,
      percentage,
      progressBarSvg,
    };
  }

  // Dynamically inject Tailwind CSS library into the page.
  // If not already loaded by the MkDocs theme, this will load Tailwind.
  const tailwindScript = document.createElement('script');
  tailwindScript.src = 'https://cdn.tailwindcss.com';
  document.head.appendChild(tailwindScript);

  // Parse progress on page load and inject the progress bar into the container.
  const progressData = parseCurrentPageProgress();
  progressBarContainer.innerHTML = progressData.progressBarSvg;
});
