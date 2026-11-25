import { createFileRoute, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { normalizeForm } from "@/lib/forms";
import { FormRenderer } from "@/components/forms/FormRenderer";

export const Route = createFileRoute("/f/$slug")({
  loader: async ({ params }) => {
    const { data } = await supabase.from("forms").select("*").eq("slug", params.slug).maybeSingle();
    if (!data) throw notFound();
    return normalizeForm(data);
  },
  head: ({ loaderData }) => ({
    meta: [
      { title: loaderData ? `${loaderData.title} · Validación de alcance` : "Formulario" },
      { name: "description", content: "Completá este formulario para validar el alcance del proyecto." },
      { property: "og:title", content: loaderData?.title ?? "Formulario" },
      { property: "og:description", content: "Completá este formulario para validar el alcance del proyecto." },
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
  const form = Route.useLoaderData();
  return (
    <div className="min-h-screen">
      <FormRenderer form={form} onSubmit={async (answers) => {
        const { error } = await supabase.from("responses").insert({ form_id: form.id, answers });
        if (error) throw error;
      }} />
    </div>
  );
}
