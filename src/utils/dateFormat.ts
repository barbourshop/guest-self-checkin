/**
 * Format a timestamp string to a readable date format
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Formatted date string (e.g., "Jan 1, 2024 3:45 PM")
 */
export function formatDate(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return 'N/A';
  }

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return 'Invalid Date';
  }
}

/**
 * Format a timestamp to a relative time string
 * @param {string} timestamp - ISO timestamp string
 * @returns {string} Relative time string (e.g., "2 hours ago", "3 days ago")
 */
export function formatRelativeTime(timestamp: string | null | undefined): string {
  if (!timestamp) {
    return 'N/A';
  }

  try {
    const date = new Date(timestamp);
    if (isNaN(date.getTime())) {
      return 'Invalid Date';
    }

    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.floor(diffMs / 1000);
    const diffMins = Math.floor(diffSecs / 60);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSecs < 60) {
      return 'Just now';
    } else if (diffMins < 60) {
      return `${diffMins} minute${diffMins !== 1 ? 's' : ''} ago`;
    } else if (diffHours < 24) {
      return `${diffHours} hour${diffHours !== 1 ? 's' : ''} ago`;
    } else if (diffDays < 7) {
      return `${diffDays} day${diffDays !== 1 ? 's' : ''} ago`;
    } else {
      return formatDate(timestamp);
    }
  } catch {
    return 'Invalid Date';
  }
}


