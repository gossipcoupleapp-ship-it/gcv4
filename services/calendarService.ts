
import { CalendarEvent } from "../types";

export const CalendarService = {
  /**
   * Generates a Google Calendar web link (render URL)
   * allowing the user to view the event on the official Google Calendar interface.
   */
  generateGoogleLink: (event: Omit<CalendarEvent, 'id'>, coupleName: string): string => {
    const baseUrl = "https://calendar.google.com/calendar/render?action=TEMPLATE";
    
    // Format dates to YYYYMMDDTHHmmssZ (approximate for link generation)
    // Removing hyphens, colons, and milliseconds
    const formatTime = (isoString: string) => isoString.replace(/-|:|\.\d\d\d/g, "");
    
    const startStr = formatTime(event.start);
    const endStr = formatTime(event.end);
    
    let details = `${event.description || ''}`;
    details += `\n\n--- Gossip Couple Details ---`;
    details += `\nType: ${event.type.toUpperCase()}`;
    details += `\nResponsible: ${event.assignee === 'both' ? 'Both' : (event.assignee === 'user1' ? 'Alex' : 'Sam')}`;
    if (event.value) details += `\nValue: $${event.value}`;
    if (event.linkedGoalId) details += `\nLinked Goal ID: ${event.linkedGoalId}`;

    const params = new URLSearchParams({
      text: event.title,
      dates: `${startStr}/${endStr}`,
      details: details,
      location: coupleName || "Home",
      // sf=true (Source Feed)
    });

    return `${baseUrl}&${params.toString()}`;
  },

  /**
   * Simulates an Async API call to Google Calendar API.
   * In a real production app, this would use gapi.client.calendar.events.insert
   */
  syncEvent: async (event: Omit<CalendarEvent, 'id'>): Promise<{ success: boolean; link: string }> => {
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Generate the real link that would be returned/used
    const link = CalendarService.generateGoogleLink(event, "My Couple");

    // Return success
    return {
      success: true,
      link: link
    };
  }
};
