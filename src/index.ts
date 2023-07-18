import { ComponentSettings, Manager, MCEvent } from '@managed-components/types'
import { uuidv4NoDashes, hashString, getRegionPrefix } from './utils'

export const sendEvent =
  (settings: ComponentSettings) => async (event: MCEvent) => {
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

    client.fetch(
      `https://track${getRegionPrefix(
        regionPrefix
      )}.hubspot.com/__ptq.gif?${params}`,
      {
        credentials: 'include',
        keepalive: true,
        mode: 'no-cors',
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

const getFormEventRequestData = (event: MCEvent, portalId: string) => {
  const { client, payload } = event
  let { formId, formClass } = payload
  const {
    timestamp,
    email,
    firstName,
    lastName,
    identifyEmail,
    identifyUserId,
    po,
    ...formValues
  } = payload
  const utk = client.get('hubspotutk')
  formId = formId?.trim().replace(/^[#]/, '')
  formClass = formClass?.trim()

  return {
    contactFields: { email, firstName, lastName },
    formSelectorClasses: formClass
      ?.split(' ')
      .filter((str: string) => str.length)
      .map((str: string) => `.${str}`)
      .join(', '),
    collectedFormClasses: formClass,
    formSelectorId: formId ? `#${formId}` : formId,
    collectedFormId: formId,
    formValues,
    pageTitle: client.title,
    pageUrl: client.url.href,
    portalId,
    type: 'SCRAPED',
    utk,
    uuid: crypto.randomUUID(),
    version: 'collected-forms-embed-js-static-1.312',
  }
}

export const handleFormEvent =
  (settings: ComponentSettings) => async (event: MCEvent) => {
    const { accountId, regionPrefix } = settings
    event.client.fetch(
      `https://forms${getRegionPrefix(
        regionPrefix
      )}.hubspot.com/collected-forms/submit/form`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(getFormEventRequestData(event, accountId)),
      }
    )
  }

export default async function (manager: Manager, settings: ComponentSettings) {
  manager.addEventListener('pageview', sendEvent(settings))
  manager.addEventListener('event', sendEvent(settings))
  manager.addEventListener('chat', handleChatEvent(settings))
  manager.addEventListener('form', handleFormEvent(settings))
}
