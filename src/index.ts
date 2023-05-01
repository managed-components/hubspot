import { ComponentSettings, Manager, MCEvent } from '@managed-components/types'
import { uuidv4NoDashes, hashString, getRegionPrefix } from './utils'
import UAParser from 'ua-parser-js'

export const sendEvent =
  (manager: Manager, settings: ComponentSettings) => async (event: MCEvent) => {
    const { accountId, regionPrefix, domainName } = settings
    const { client, payload, type } = event
    const {
      identifyEmail,
      identifyUserId,
      n,
      property_name,
      property_value,
      ...cleanPayload
    } = payload

    const hubspotParams = {
      k: type === 'pageview' ? 1 : 3,
      v: '1.1',
      a: accountId,
      pu: client.url.href,
      t: client.title,
      cts: new Date().valueOf(),
      ...(type === 'event' &&
        property_name && {
          ['_' + property_name]: property_value,
        }),
      ...(type === 'event' && n && { n }),
      ...((identifyEmail || identifyUserId) && {
        i: new URLSearchParams({
          ...(identifyEmail && { email: identifyEmail }),
          ...(identifyUserId && { id: identifyUserId }),
        }).toString(),
      }),
      ...(client.referer && {
        r: client.referer,
      }),
      sd:
        client.screenHeight && client.screenWidth
          ? client.screenWidth + 'x' + client.screenHeight
          : undefined,
      ln: client.language,
      ...cleanPayload, // includes cs, po and custom fields
    }

    // Extract VI from cookie
    const visitorCookieName = 'hubspotutk'
    const visitorCookie = client.get(visitorCookieName)
    if (visitorCookie) {
      hubspotParams['vi'] = visitorCookie
      hubspotParams['nc'] = false
    } else {
      hubspotParams['vi'] = uuidv4NoDashes()
      hubspotParams['nc'] = true
      client.set(visitorCookieName, hubspotParams['vi'])
    }

    const sessionCookie = 'hssrc'
    const newSession = client.get(sessionCookie) ? false : true
    if (newSession) {
      client.set(sessionCookie, '1', { scope: 'session' })
    }

    // Mimic the Hubspot string hashing
    const domain = hashString(domainName)

    // Extract U from cookie
    const uCookieName = 'hstc'
    const uCookie = client.get(uCookieName)
    if (uCookie) {
      if (newSession) {
        const uCookieVars = uCookie.split('.')
        uCookieVars[3] = uCookieVars[4] // Set the now old "current session time" as the previous one
        uCookieVars[4] = new Date().valueOf().toString() // Set the recent session time as the current time
        hubspotParams['u'] = uCookieVars.join('.')
        client.set(uCookieName, hubspotParams['u'])
      } else {
        hubspotParams['u'] = uCookie
      }
    } else {
      hubspotParams['u'] = [
        domain,
        hubspotParams['vi'],
        new Date().valueOf(),
        new Date().valueOf(),
        new Date().valueOf(),
        1,
      ].join('.')
      client.set(uCookieName, hubspotParams['u'], { scope: 'infinite' })
    }

    // Extract B from cookie
    const bCookieName = 'hssc'
    const bCookie = client.get(bCookieName)
    if (bCookie) {
      const bCookieVars = bCookie.split('.')
      bCookieVars[1] = (parseInt(bCookieVars[1]) + 1).toString()
      hubspotParams['b'] = bCookieVars.join('.')
    } else {
      hubspotParams['b'] = [domain, 1, new Date().valueOf()].join('.')
    }
    client.set(bCookieName, hubspotParams['b'])

    const params = new URLSearchParams(hubspotParams).toString()

    manager.fetch(
      `https://track${getRegionPrefix(
        regionPrefix
      )}.hubspot.com/__ptq.gif?${params}`,
      {
        credentials: 'include',
        keepalive: true,
        mode: 'no-cors',
        headers: {
          Cookie: `hubspotutk=${client.get('hubspotutk')}; hssc=${client.get(
            'hssc'
          )}; hstc=${client.get('hstc')}; hssrc=${client.get('hssrc')}`,
          referer: client.referer,
          'User-Agent': client.userAgent,
          'X-HS-Public-Host': domainName,
          'X-HubSpot-Trust-Forwarded-For': 'true',
          'X-Real-IP': client.ip,
          'X-Forwarded-Proto': client.url.protocol.replace(':', ''),
          'X-Forwarded-For': client.ip,
          'X-HubSpot-Client-IP': client.ip,
        },
      }
    )
  }

export const handleChatEvent =
  (settings: ComponentSettings) =>
  async ({ client }: MCEvent) => {
    const { accountId, regionPrefix } = settings
    client.execute(
      `!function(t,e,r){if(!document.getElementById(t)){var n=document.createElement("script");for(var a in n.src="https://js${getRegionPrefix(
        regionPrefix
      )}.usemessages.com/conversations-embed.js",n.type="text/javascript",n.id=t,r)r.hasOwnProperty(a)&&n.setAttribute(a,r[a]);var i=document.getElementsByTagName("script")[0];i.parentNode.insertBefore(n,i)}}("hubspot-messages-loader",0,{"data-loader":"hs-scriptloader","data-hsjs-portal":${accountId},"data-hsjs-env":"prod"${
        regionPrefix ? `,"data-hsjs-hublet":"${regionPrefix}"` : ''
      }});`
    )
  }

export const handleFormEvent =
  (manager: Manager, settings: ComponentSettings) => async (event: MCEvent) => {
    const { accountId, regionPrefix } = settings
    const formId = event.payload.formId

    const hs_context = {
      hutk: event.client.get('hubspotutk'),
      ipAddress: event.client.ip,
      pageUrl: event.client.url,
      pageName: event.client.title,
    }

    const requestBodyParams = [
      `hs_context=${encodeURIComponent(JSON.stringify(hs_context))}`,
    ]

    for (const key in event.payload) {
      if (key === 'formId') continue
      requestBodyParams.push(`${key}=${encodeURIComponent(event.payload[key])}`)
    }

    manager.fetch(
      `https://forms${getRegionPrefix(
        regionPrefix
      )}.hubspot.com/uploads/form/v2/${accountId}/${formId}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        redirect: 'manual',
        body: requestBodyParams.join('&'),
      }
    )
  }

export default async function (manager: Manager, settings: ComponentSettings) {
  manager.addEventListener('pageview', sendEvent(manager, settings))
  manager.addEventListener('event', sendEvent(manager, settings))
  manager.addEventListener('chat', handleChatEvent(settings))
  manager.addEventListener('form', handleFormEvent(manager, settings))
}
