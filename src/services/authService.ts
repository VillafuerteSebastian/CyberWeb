import { supabase } from "../lib/supabaseClient";

export type RegisterPayload = {
  cedula: string;
  nombre_completo: string;
  correo: string;
  telefono: string;
  password: string;
  confirm_password: string;
  role: "USER";
};

export type LoginPayload = {
  correo: string;
  password: string;
};

export type ChangePasswordPayload = {
  current_password: string;
  new_password: string;
  confirm_password: string;
};

export type Address = {
  direccion: string;
  predeterminada?: boolean;
};

export type Profile = {
  id: string;
  cedula?: string;
  nombre_completo?: string;
  correo?: string;
  telefono?: string;
  direcciones?: Address[];
  role?: "admin" | "user";
};

export const registerUser = async (payload: RegisterPayload) => {
  const { data, error } = await supabase.auth.signUp({
    email: payload.correo,
    password: payload.password,
    options: {
      data: {
        cedula: payload.cedula,
        nombre_completo: payload.nombre_completo,
        telefono: payload.telefono,
      },
    },
  });

  if (error) {
    throw { response: { data: { message: error.message } } };
  }

  return { message: "Usuario registrado correctamente", data };
};

export const loginUser = async (payload: LoginPayload) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: payload.correo,
    password: payload.password,
  });

  if (error) {
    const message =
      error.code === "email_not_confirmed" || /not confirmed/i.test(error.message)
        ? "Debes confirmar tu correo antes de iniciar sesión. Revisa tu bandeja de entrada."
        : error.message || "Correo o contraseña incorrectos";

    throw { response: { data: { message } } };
  }

  return {
    data: {
      access_token: data.session?.access_token,
      refresh_token: data.session?.refresh_token,
      token_type: "bearer",
      role: "USER",
    },
  };
};

export const getProfile = async () => {
  const { data: userData, error: userError } = await supabase.auth.getUser();

  if (userError || !userData?.user) {
    throw { response: { data: { message: "No hay sesión activa" } } };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (profileError) {
    throw { response: { data: { message: profileError.message } } };
  }

  return {
    data: {
      id: userData.user.id,
      cedula: profile?.cedula || "",
      nombre_completo: profile?.nombre_completo || "",
      correo: profile?.correo || userData.user.email || "",
      telefono: profile?.telefono || "",
      direcciones: profile?.direcciones || [],
      role: (profile?.role || "user") as "admin" | "user",
    },
  };
};

export const changePassword = async (payload: ChangePasswordPayload) => {
  if (payload.new_password !== payload.confirm_password) {
    throw { response: { data: { message: "Las contraseñas no coinciden" } } };
  }

  const { data: userData } = await supabase.auth.getUser();
  const email = userData?.user?.email;

  if (!email) {
    throw { response: { data: { message: "No hay sesión activa" } } };
  }

  // Revalida la contraseña actual antes de permitir el cambio.
  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: payload.current_password,
  });

  if (reauthError) {
    throw { response: { data: { message: "La contraseña actual no es correcta" } } };
  }

  const { error } = await supabase.auth.updateUser({
    password: payload.new_password,
  });

  if (error) {
    throw { response: { data: { message: error.message } } };
  }

  return { message: "Contraseña actualizada correctamente. Debes iniciar sesión de nuevo." };
};
