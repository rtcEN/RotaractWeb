
import { useState } from 'react'
import { Eye, EyeOff, Heart, ShieldCheck, ArrowRight } from 'lucide-react'
import { supabase } from '../supabaseClient'

export default function Login({ onLoginExitoso }) {
  const [correo, setCorreo] = useState('')
  const [password, setPassword] = useState('')
  const [mostrarPassword, setMostrarPassword] = useState(false)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  async function handleSubmit(e) {
    e.preventDefault()

    setError(null)
    setCargando(true)

    const { data, error: errorLogin } =
      await supabase.auth.signInWithPassword({
        email: correo,
        password: password,
      })

    if (errorLogin) {
      setError('Correo o contraseña incorrectos')
      setCargando(false)
      return
    }

    const { data: miembro, error: errorMiembro } = await supabase
      .from('miembro')
      .select('*')
      .eq('user_id', data.user.id)
      .single()

    if (errorMiembro) {
      setError('No se encontró tu registro de miembro')
    } else if (onLoginExitoso) {
      onLoginExitoso(miembro)
    }

    setCargando(false)
  }

  return (
    <main className="rtc-login-page">

      {/* Decoraciones del fondo */}
      <div className="rtc-login-circle rtc-login-circle-1"></div>
      <div className="rtc-login-circle rtc-login-circle-2"></div>
      <div className="rtc-login-circle rtc-login-circle-3"></div>

      <div className="rtc-login-wrapper">

        {/* ==================================================
            PRESENTACIÓN / WOLFIE
        ================================================== */}

        <section className="rtc-login-welcome">

          <div className="rtc-wolfie-container">
            <img
              src={`${import.meta.env.BASE_URL}images/wolfie1.png`}
              alt="Wolfie - Mascota de Rotaract Encarnación Norte"
            />
          </div>

          <div className="rtc-welcome-text">

            <h1>
              ¡Bienvenido/a!
            </h1>

            <p>
              al sistema del{' '}
              <strong>
                Club Rotaract Encarnación Norte
              </strong>
            </p>

            <div className="rtc-welcome-features">

              <div className="rtc-welcome-feature">
                <div className="rtc-feature-icon">
                  <Heart size={18} />
                </div>

                <span>
                  Servir para
                  <br />
                  cambiar vidas
                </span>
              </div>

              <div className="rtc-welcome-feature">
                <div className="rtc-feature-icon">
                  <ShieldCheck size={18} />
                </div>

                <span>
                  Acceso seguro
                  <br />
                  para miembros
                </span>
              </div>

            </div>

          </div>

        </section>


        {/* ==================================================
            LOGIN
        ================================================== */}

        <section className="rtc-login-card">

          <div className="rtc-login-logo">
            <img
              src={`${import.meta.env.BASE_URL}images/logo.png`}
              alt="Rotaract Encarnación Norte"
            />
          </div>

          <div className="rtc-login-heading">

            <h2>
              Iniciar sesión
            </h2>

            <p>
              Ingresá a tu cuenta para continuar.
            </p>

          </div>


          <form onSubmit={handleSubmit}>

            {/* CORREO */}

            <div className="rtc-login-field">

              <label htmlFor="correo">
                Correo electrónico
              </label>

              <input
                id="correo"
                type="email"
                value={correo}
                onChange={(e) => setCorreo(e.target.value)}
                placeholder="ejemplo@correo.com"
                autoComplete="email"
                required
              />

            </div>


            {/* CONTRASEÑA */}

            <div className="rtc-login-field">

              <label htmlFor="password">
                Contraseña
              </label>

              <div className="rtc-password-wrapper">

                <input
                  id="password"
                  type={mostrarPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Ingresá tu contraseña"
                  autoComplete="current-password"
                  required
                />

                <button
                  type="button"
                  className="rtc-password-toggle"
                  onClick={() =>
                    setMostrarPassword((valor) => !valor)
                  }
                  aria-label={
                    mostrarPassword
                      ? 'Ocultar contraseña'
                      : 'Mostrar contraseña'
                  }
                >
                  {mostrarPassword ? (
                    <EyeOff size={19} />
                  ) : (
                    <Eye size={19} />
                  )}
                </button>

              </div>

            </div>


            {/* ERROR */}

            {error && (
              <div className="rtc-login-error">

                <span className="rtc-error-icon">
                  !
                </span>

                <span>
                  {error}
                </span>

              </div>
            )}


            {/* BOTÓN */}

            <button
              type="submit"
              className="rtc-login-submit"
              disabled={cargando}
            >

              {cargando ? (
                <>
                  <span className="rtc-spinner"></span>
                  Ingresando...
                </>
              ) : (
                <>
                  Ingresar
                  <ArrowRight size={19} />
                </>
              )}

            </button>

          </form>


          {/* FOOTER */}

          <div className="rtc-login-footer">

            <span>
              Rotaract Encarnación Norte
            </span>

            <span className="rtc-footer-dot">
              •
            </span>

            <span>
              Servicio, amistad y liderazgo
            </span>

          </div>

        </section>

      </div>

    </main>
  )
}