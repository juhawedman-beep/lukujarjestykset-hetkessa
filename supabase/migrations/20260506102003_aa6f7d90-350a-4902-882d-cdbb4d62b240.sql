CREATE TABLE public.students (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  class_id uuid NOT NULL,
  first_name text NOT NULL,
  last_name text NOT NULL,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_students_class ON public.students(class_id);
CREATE INDEX idx_students_owner ON public.students(owner_id);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owners full access students"
ON public.students
FOR ALL
USING (auth.uid() = owner_id)
WITH CHECK (auth.uid() = owner_id);

CREATE TRIGGER update_students_updated_at
BEFORE UPDATE ON public.students
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();