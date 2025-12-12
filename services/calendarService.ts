
import { CalendarEvent } from "../types";
import { supabase } from '../src/lib/supabase';

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
    if (event.value) details += `\nValue: R$${event.value}`;
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
   * Retrieves the secure Google OAuth token from Supabase session
   */
  getGoogleToken: async (): Promise<string | null> => {
    const { data } = await supabase.auth.getSession();
    return data.session?.provider_token || null;
  },

  /**
   * Creates an event in the real Google Calendar API
   */
  syncEvent: async (event: Omit<CalendarEvent, 'id'>): Promise<{ success: boolean; link: string; googleId?: string }> => {
    const token = await CalendarService.getGoogleToken();

    // If no token, user hasn't granted adding to calendar scope or session is expired.
    // For now, we fall back to just generating the link without API insert.
    if (!token) {
      console.warn("No Google Token found. Falling back to manual link generation.");
      return {
        success: false,
        link: CalendarService.generateGoogleLink(event, "My Couple")
      };
    }

    try {
      const response = await fetch('https://www.googleapis.com/calendar/v3/calendars/primary/events', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          summary: event.title,
          description: `${event.description || ''}\n\n(Added via Gossip Couple)`,
          start: { dateTime: event.start }, // Must be ISO string
          end: { dateTime: event.end },     // Must be ISO string
        })
      });

      if (!response.ok) {
        if (response.status === 401) {
          console.error("Google Token Expired or Invalid");
          // Ideally prompt for re-auth here
        }
        throw new Error(`Google Calendar API Error: ${response.statusText}`);
      }

      const data = await response.json();
      return {
        success: true,
        link: data.htmlLink,
        googleId: data.id
      };

    } catch (error) {
      console.error("Failed to sync with Google Calendar:", error);
      // Fallback to manual link on error
      return {
        success: false,
        link: CalendarService.generateGoogleLink(event, "My Couple")
      };
    }
  }
};
