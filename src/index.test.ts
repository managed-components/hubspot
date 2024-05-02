import { hashString } from './utils'
import crypto from 'crypto'
import { MCEvent } from '@managed-components/types'
import {
  sendEvent,
  handleChatEvent,
  handleCollectedFormsEvent,
  prepareFormEvent,
} from '.'

if (!global.crypto) {
  vi.stubGlobal('crypto', crypto)
}

const isRecentTs = (value: string) => {
  const now = new Date().valueOf()
  const ts = parseInt(value)
  return ts <= now && ts > now - 10000
}

const getRecentTsPattern = () => {
  return new Date().valueOf().toString().slice(0, -4) + '[0-9]{4}'
}

const dummyClient = {
  title: 'Zaraz "Test" /t Page',
  timestamp: 1670502437,
  userAgent:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36',
  language: 'en-GB',
  referer: '',
  ip: '127.0.0.1',
  emitter: 'browser',
  url: new URL('http://127.0.0.1:1337'),
  screenHeight: 1080,
  screenWidth: 2560,
  fetch: () => undefined,
  set: () => undefined,
  execute: () => undefined,
  return: () => undefined,
  get: () => undefined,
  attachEvent: () => undefined,
  detachEvent: () => undefined,
}

describe('Hubspot MC event handler works correctly', () => {
  const fetchedRequests: any = []
  const setCookies: any = []

  const settings = {
    accountId: '12345',
    regionPrefix: 'eu1',
    domainName: 'domain.com',
  }

  const fakeEvent = new Event('event', {}) as MCEvent
  fakeEvent.payload = {
    identifyEmail: 'identifyEmail@email.com',
    identifyUserId: 'identifyUserId',
    n: 'event_name',
    property_name: 'property',
    property_value: 'value',
    cs: 'UTF-8',
    ln: 'en-GB',
    po: '/home',
  }
  fakeEvent.client = {
    ...dummyClient,
    fetch: (url, opts) => {
      fetchedRequests.push({ url, opts })
      return undefined
    },
    set: (key, value, opts) => {
      setCookies.push({ key, value, opts })
      return undefined
    },
  }

  const domain = hashString(settings.domainName)
  const uuidv4NoDashesPattern = '[0-9a-f]{32}'
  const uuidv4NoDashesRegex = new RegExp(`^${uuidv4NoDashesPattern}$`)
  const uCookieRegex = new RegExp(
    `^${domain}.${uuidv4NoDashesPattern}.${getRecentTsPattern()}.${getRecentTsPattern()}.${getRecentTsPattern()}.1$`
  )
  const bCookieRegex = new RegExp(`^${domain}.1.${getRecentTsPattern()}$`)

  sendEvent(settings)(fakeEvent)

  it('creates the Hubspot track request correctly', async () => {
    const request = fetchedRequests.find((x: any) =>
      x.url.startsWith('https://track-eu1.hubspot.com/__ptbe.gif?')
    )
    expect(request).toBeTruthy()
    expect(request?.opts?.mode).toEqual('no-cors')
    expect(request?.opts?.keepalive).toEqual(true)
    expect(request?.opts?.credentials).toEqual('include')

    const url = new URL(request.url)

    expect(url.pathname).toEqual('/__ptbe.gif')
    expect(url.searchParams.get('k')).toEqual('3')
    expect(url.searchParams.get('v')).toEqual('1.1')
    expect(url.searchParams.get('a')).toEqual(settings.accountId)
    expect(url.searchParams.get('pu')).toEqual(fakeEvent.client.url.href)
    expect(url.searchParams.get('t')).toEqual(fakeEvent.client.title)
    expect(url.searchParams.get('cts')).toSatisfy(isRecentTs)
    expect(url.searchParams.get('_' + fakeEvent.payload.property_name)).toEqual(
      fakeEvent.payload.property_value
    )
    expect(url.searchParams.get('n')).toEqual(fakeEvent.payload.n)
    expect(url.searchParams.get('i')).toEqual(
      new URLSearchParams({
        email: fakeEvent.payload.identifyEmail,
        id: fakeEvent.payload.identifyUserId,
      }).toString()
    )
    expect(url.searchParams.get('sd')).toEqual('2560x1080')
    expect(url.searchParams.get('cs')).toEqual(fakeEvent.payload.cs)
    expect(url.searchParams.get('ln')).toEqual(fakeEvent.client.language)
    expect(url.searchParams.get('po')).toEqual(fakeEvent.payload.po)
    expect(url.searchParams.get('vi')).toMatch(uuidv4NoDashesRegex)
    expect(url.searchParams.get('nc')).toEqual('true')
    expect(url.searchParams.get('u')).toMatch(uCookieRegex)
    expect(url.searchParams.get('b')).toMatch(bCookieRegex)
  })

  it('sets the cookies correctly', () => {
    const hubspotutk = setCookies.find((x: any) => x.key === 'hubspotutk')
    expect(hubspotutk).toBeTruthy()
    expect(hubspotutk.value).toMatch(uuidv4NoDashesRegex)

    const __hssrc = setCookies.find((x: any) => x.key === 'hssrc')
    expect(__hssrc).toBeTruthy()
    expect(__hssrc.value).toEqual('1')
    expect(__hssrc.opts?.scope).toEqual('session')

    const __hstc = setCookies.find((x: any) => x.key === 'hstc')
    expect(__hstc).toBeTruthy()
    expect(__hstc.value).toMatch(uCookieRegex)

    const __hssc = setCookies.find((x: any) => x.key === 'hssc')
    expect(__hssc).toBeTruthy()
    expect(__hssc.value).toMatch(bCookieRegex)
  })
})

describe('Hubspot MC chat handler works correctly', () => {
  let script: string | undefined = undefined

  const settings = {
    accountId: '12345',
    regionPrefix: 'eu1',
  }

  const fakeEvent = new Event('chat', {}) as MCEvent
  fakeEvent.client = {
    ...dummyClient,
    execute: (str: string) => {
      script = str
      return undefined
    },
  }

  handleChatEvent(settings)(fakeEvent)

  it('creates the Hubspot chat script correctly', async () => {
    expect(script).toBeDefined()
    expect(script).toEqual(
      `!function(t,e,r){if(!document.getElementById(t)){var n=document.createElement("script");for(var a in n.src="https://js-${settings.regionPrefix}.usemessages.com/conversations-embed.js",n.type="text/javascript",n.id=t,r)r.hasOwnProperty(a)&&n.setAttribute(a,r[a]);var i=document.getElementsByTagName("script")[0];i.parentNode.insertBefore(n,i)}}("hubspot-messages-loader",0,{"data-loader":"hs-scriptloader","data-hsjs-portal":${settings.accountId},"data-hsjs-env":"prod","data-hsjs-hublet":"${settings.regionPrefix}"});`
    )
  })
})

describe('Hubspot MC Collected Form handler works correctly', () => {
  let fetchRequest: any
  const utk = 'dummy-utk-cookie-value'

  const settings = {
    accountId: '12345',
    regionPrefix: 'eu1',
    domainName: 'domain.com',
  }

  const fakeEvent = new Event('collected-form', {}) as MCEvent
  fakeEvent.payload = {
    formId: 'form_id',
    formClass: 'my_class other_class',
    email: 'someemail@gmail.com',
    firstName: 'Name',
    lastName: 'Last name',
    somedata: 'some data',
  }
  fakeEvent.client = {
    ...dummyClient,
    fetch: (url, opts) => {
      fetchRequest = { url, opts }
      return undefined
    },
    get: key => {
      if (key === 'hubspotutk') return utk
      return undefined
    },
  }

  handleCollectedFormsEvent(settings)(fakeEvent)

  it('creates the Hubspot collected form track request correctly', async () => {
    expect(fetchRequest).toBeTruthy()
    expect(fetchRequest.url).toEqual(
      `https://forms-${settings.regionPrefix}.hubspot.com/collected-forms/submit/form`
    )
    expect(fetchRequest.opts?.method).toEqual('POST')
    expect(fetchRequest.opts?.headers?.['Content-Type']).toEqual(
      'application/json'
    )

    try {
      const body = JSON.parse(fetchRequest.opts?.body)

      expect(body).toStrictEqual({
        contactFields: {},
        formSelectorId: '',
        collectedFormId: '',
        formSelectorClasses: '',
        collectedFormClasses: '',
        formValues: {},
        pageTitle: '',
        pageUrl: '',
        portalId: '',
        type: '',
        utk: '',
        uuid: '',
        version: '',
      })
      expect(body.contactFields).toStrictEqual({
        email: '',
        firstName: '',
        lastName: '',
      })
      expect(body.contactFields.email).toEqual(fakeEvent.payload.email)
      expect(body.contactFields.firstName).toEqual(fakeEvent.payload.firstName)
      expect(body.contactFields.lastName).toEqual(fakeEvent.payload.lastName)
      expect(body.formSelectorId).toEqual(`#${fakeEvent.payload.formId}`)
      expect(body.collectedFormId).toEqual(fakeEvent.payload.formId)
      expect(body.formSelectorClasses).toEqual(`.my_class, .other_class`)
      expect(body.collectedFormClasses).toEqual(fakeEvent.payload.formClass)
      expect(body.formValues).toStrictEqual({ somedata: '' })
      expect(body.formValues.somedata).toEqual(fakeEvent.payload.somedata)
      expect(body.pageTitle).toEqual(fakeEvent.client.title)
      expect(body.pageUrl).toEqual(fakeEvent.client.url)
      expect(body.portalId).toEqual(settings.accountId)
      expect(body.type).toEqual('SCRAPED')
      expect(body.utk).toEqual(utk)
      expect(body.uuid).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
      )
      expect(body.version).toEqual('collected-forms-embed-js-static-1.312')
    } catch {
      return false
    }
  })
})

describe('Hubspot MC Form handler works correctly', () => {
  const settings = {
    accountId: '12345',
    regionPrefix: 'eu1',
    domainName: 'domain.com',
  }

  const fakeEvent = new Event('form', {}) as MCEvent
  fakeEvent.payload = {
    formId: 'form_id',
    formClass: 'my_class other_class',
    email: 'someemail@gmail.com',
    firstName: 'Name',
    lastName: 'Last name',
    somedata: 'some data',
  }
  fakeEvent.client = {
    ...dummyClient,
    fetch: () => {
      return undefined
    },
    get: key => {
      if (key === 'hubspotutk') return 'dummy-utk'
      return undefined
    },
  }

  it('Forms the hubspot form request payload correctly', () => {
    const { url, data } = prepareFormEvent(settings, fakeEvent)

    expect(url).toBe(
      `https://api.hsforms.com/submissions/v3/integration/submit/12345/form_id`
    )

    data.fields.forEach((field: any) => {
      expect(field.name).toBeTruthy()
      expect(field.value).toBeTruthy()
    })
  })

  it('Forms the hubspot form request payload correctly if accountId is passed via action', () => {
    fakeEvent.payload = {
      formId: 'form_id2',
      formClass: 'my_class other_class',
      email: 'someemail@gmail.com',
      firstName: 'Name',
      lastName: 'Last name',
      somedata: 'some data',
      accountId: 'account_id_passed_from_action',
    }
    const { url } = prepareFormEvent(settings, fakeEvent)
    expect(url).toBe(
      `https://api.hsforms.com/submissions/v3/integration/submit/account_id_passed_from_action/form_id2`
    )
  })
})
