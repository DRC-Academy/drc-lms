-- ===============================================================
-- EL RELOJ DEL BLACK PASS (pg_cron + pg_net)
--
-- ⚠ SE EJECUTA EN LA BASE DEL LMS, Y DESPUÉS DE DESPLEGAR: llama a rutas
-- que antes del despliegue no existen. Con PASES_ACTIVO apagado las rutas
-- contestan al momento sin hacer nada, así que se puede dejar puesto.
--
-- Va por aquí porque Vercel Hobby solo admite crons diarios. Es lo mismo que
-- hace Gestión con sus ausencias. `vercel.json` llama además a la conciliación
-- una vez al día, por si esto falla.
--
-- ANTES DE EJECUTAR: cambia PEGAR_AQUI_CRON_SECRET por el valor de CRON_SECRET
-- en Vercel, y comprueba la URL si el LMS ya no está en drc-lms.vercel.app.
-- Idempotente.
-- ===============================================================

do $$
declare
  v_secreto text := 'PEGAR_AQUI_CRON_SECRET';
  v_id uuid;
begin
  if v_secreto = 'PEGAR_AQUI_CRON_SECRET' or length(v_secreto) < 16 then
    raise exception 'Cambia PEGAR_AQUI_CRON_SECRET por el valor de CRON_SECRET antes de ejecutar esto.';
  end if;

  select id into v_id from vault.secrets where name = 'cron_pases_secret';
  if v_id is null then
    perform vault.create_secret(v_secreto, 'cron_pases_secret', 'CRON_SECRET del LMS, para las rutas del Black Pass');
  else
    perform vault.update_secret(v_id, v_secreto);
  end if;
end $$;

do $$
declare
  v_job text;
begin
  foreach v_job in array array['pases-conciliar', 'pases-cola', 'pases-purgar'] loop
    if exists (select 1 from cron.job where jobname = v_job) then
      perform cron.unschedule(v_job);
    end if;
  end loop;
end $$;

-- La conciliación. Cada 5 minutos durante la venta; ver abajo para después.
select cron.schedule(
  'pases-conciliar',
  '*/5 * * * *',
  $job$
  select net.http_get(
    url := 'https://drc-lms.vercel.app/api/woo/conciliar',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_pases_secret')
    ),
    timeout_milliseconds := 60000
  );
  $job$
);

-- La cola de correo.
select cron.schedule(
  'pases-cola',
  '* * * * *',
  $job$
  select net.http_get(
    url := 'https://drc-lms.vercel.app/api/woo/cola',
    headers := jsonb_build_object(
      'Authorization',
      'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'cron_pases_secret')
    ),
    timeout_milliseconds := 60000
  );
  $job$
);

-- Los eventos del webhook llevan datos personales: fuera a los 90 días.
select cron.schedule('pases-purgar', '30 3 * * *', $job$ select public.purgar_pases_eventos(90); $job$);

-- Esperado: las tres filas, con active = true.
select jobname, schedule, active
  from cron.job
 where jobname in ('pases-conciliar', 'pases-cola', 'pases-purgar')
 order by jobname;


-- ===============================================================
-- PASADA LA VENTA (a partir del 22/11): más despacio. Los reembolsos y las
-- transferencias siguen llegando, pero el webhook ya los trae al momento.
-- ===============================================================

-- select cron.alter_job((select jobid from cron.job where jobname = 'pases-conciliar'), schedule := '0 * * * *');
-- select cron.alter_job((select jobid from cron.job where jobname = 'pases-cola'), schedule := '*/5 * * * *');


-- ===============================================================
-- COMPROBAR QUE ANDA
-- ===============================================================

-- select start_time, status, return_message from cron.job_run_details
--  where jobid = (select jobid from cron.job where jobname = 'pases-conciliar')
--  order by start_time desc limit 5;
-- select created, status_code, left(content, 300) from net._http_response order by created desc limit 10;


-- ===============================================================
-- DESHACER
-- ===============================================================

-- select cron.unschedule('pases-conciliar');
-- select cron.unschedule('pases-cola');
-- select cron.unschedule('pases-purgar');
-- delete from vault.secrets where name = 'cron_pases_secret';
