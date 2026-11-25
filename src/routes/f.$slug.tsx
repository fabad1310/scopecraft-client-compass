import { createFileRoute, notFound, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { normalizeForm } from "@/lib/forms";
import { SETTINGS_SLUG } from "@/lib/admin-settings";
import { FormRenderer, type SubmittedResponse } from "@/components/forms/FormRenderer";

async function latestResponse(formId: string): Promise<SubmittedResponse | null> {
  const { data } = await supabase.from("responses").select("answers, created_at").eq("form_id", formId).order("created_at", { ascending: false }).limit(1);
  const r = data?.[0];
  return r ? { answers: (r.answers ?? {}) as SubmittedResponse["answers"], created_at: r.created_at } : null;
}

export const Route = createFileRoute("/f/$slug")({
  loader: async ({ params }) => {
    if (params.slug === SETTINGS_SLUG) throw notFound();
    const { data } = await supabase.from("forms").select("*").eq("slug", params.slug).maybeSingle();
    if (!data) throw notFound();
    const form = normalizeForm(data);
    return { form, submitted: await latestResponse(form.id) };
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.form.title} · Alto Perfil` : "Formulario" },
      { name: "description", content: "Completá este formulario de Alto Perfil." },
      { property: "og:title", content: loaderData?.form.title ?? "Formulario" },
      { property: "og:description", content: "Completá este formulario de Alto Perfil." },
      { name: "robots", content: "noindex,nofollow" },
    ],
  }),
  notFoundComponent: () => (
    <div className="admin-bg flex min-h-screen items-center justify-center text-center">
      <div><h1 className="font-display text-3xl">Enlace no válido</h1><p className="mt-2 text-muted-foreground">Este formulario no existe o fue eliminado.</p></div>
    </div>
  ),
  component: PublicForm,
});

function PublicForm() {
  const { form, submitted } = Route.useLoaderData();
  const router = useRouter();
  return (
    <div className="min-h-screen">
      <FormRenderer key={submitted?.created_at ?? "open"} form={form} submitted={submitted} onSubmit={async (answers) => {
        // One response per questionnaire: if it was already sent (e.g. from another tab), show the locked view.
        if (await latestResponse(form.id)) {
          await router.invalidate();
          throw new Error("Este formulario ya fue respondido.");
        }
        const { error } = await supabase.from("responses").insert({ form_id: form.id, answers });
        if (error) throw new Error("No pudimos enviar el formulario. Intentá nuevamente.");
      }} />
    </div>
  );
}
