
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
    try {
      const { data, error } = await supabase.functions.invoke('calendar-proxy', {
        body: { event }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);

      return {
        success: true,
        link: data.link,
        googleId: data.googleId // Edge function doesn't strictly return this yet but could be added
      };

    } catch (error) {
      console.error("Failed to sync with Google Calendar:", error);
      console.warn("Falling back to manual link generation.");
      // Fallback to manual link on error (e.g., no connection or API error)
      return {
        success: false,
        link: CalendarService.generateGoogleLink(event, "My Couple")
      };
    }
  }
};
