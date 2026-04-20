/* THIS FILE IS A PART OF PAYLOAD CMS — DO NOT MODIFY. */
import type { ServerFunctionClient } from 'payload'

import config from '@payload-config'
import { handleServerFunctions, RootLayout } from '@payloadcms/next/layouts'
import React from 'react'

import { importMap } from './admin/importMap.js'

// Admin stylesheet. Payload v3 publishes @payloadcms/next pre-compiled with
// SCSS imports stripped out of the JS and the source .scss files removed from
// the package. In dev that works fine (Turbopack dev + webpack both process
// the original SCSS via source maps), but in Next.js 16 Turbopack production
// the templates/nav/forms CSS goes missing — admin renders with raw browser
// defaults (unstyled body, blue underlined links, blank sidebar).
//
// The fix is to import Payload's pre-bundled admin stylesheet directly. This
// ships as a single ~300KB file at `@payloadcms/next/css` (→ dist/prod/styles.css)
// containing `.template-default`, `.template-minimal`, `.nav`, `.login__form`,
// `.doc-header`, etc. — everything our custom.scss references as selectors but
// doesn't define.
//
// Must come BEFORE custom.scss so our `@layer payload` overrides win over
// Payload's `@layer payload-default`. (Payload's Root layout also injects
// `<style>@layer payload-default, payload;</style>` into <head>, which pins the
// layer precedence regardless of load order — belt-and-braces.)
import '@payloadcms/next/css'
import './custom.scss'

type Args = {
  children: React.ReactNode
}

const serverFunction: ServerFunctionClient = async function (args) {
  'use server'
  return handleServerFunctions({
    ...args,
    config,
    importMap,
  })
}

const Layout = ({ children }: Args) => (
  <RootLayout config={config} importMap={importMap} serverFunction={serverFunction}>
    {children}
  </RootLayout>
)

export default Layout
