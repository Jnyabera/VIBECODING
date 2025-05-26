import { serve } from "https://deno.land/std/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

serve(async () => {
  const now = new Date();
  const inOneHour = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const { data: appointments } = await supabase
    .from("appointments")
    .select("id, appointment_time, patient:patient_id(phone_number), doctor:doctor_id(phone_number)")
    .gte("appointment_time", now.toISOString())
    .lt("appointment_time", inOneHour);

  if (!appointments) return new Response("No upcoming appointments");

  for (const a of appointments) {
    await fetch("https://api.twilio.com/2010-04-01/Accounts/YOUR_SID/Messages.json", {
      method: "POST",
      headers: {
        "Authorization": "Basic " + btoa("YOUR_SID:YOUR_AUTH_TOKEN"),
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        From: "YOUR_TWILIO_NUMBER",
        To: a.patient.phone_number,
        Body: `Reminder: You have an appointment at ${a.appointment_time}`,
      }),
    });
  }

  return new Response("Reminders sent!");
});