import { AIAdapter, INSTRUCT_SERVICES, PersonaFormat } from '/common/adapters'
import { modernJailbreak } from '/common/templates'
import { AppSchema } from '/common/types'
import { NewCharacter } from '/web/store'
import { msgsApi } from '/web/store/data/messages'

export type GenField =
  | 'firstname'
  | 'personality'
  | 'speech'
  | 'behaviour'
  | 'appearance'
  | 'greeting'
  | 'scenario'
  | 'example1'
  | 'example2'
  | 'example3'

export async function generateChar(description: string, service: string, kind: PersonaFormat) {
  const [svc, _model] = service?.split('/') as [AIAdapter, string]
  const template =
    svc === 'novel'
      ? novelGenTemplate
      : INSTRUCT_SERVICES[service as AIAdapter]
      ? instructGenTemplate
      : genTemplate
  const prompt = template.replace(`{{description}}`, description)

  const vars = await msgsApi.guidance({ prompt, service })
  const char: NewCharacter = {
    originalAvatar: undefined,
    description,
    name: vars.firstname,
    persona: toAttributes(kind, vars),
    appearance: vars.appearance,
    greeting: vars.greeting,
    sampleChat: `{{char}}: ${vars.example1}\n{{char}}: ${vars.example2}\n{{char}}: ${vars.example3}`,
    scenario: vars.scenario,
  }

  return char
}

export async function regenerateCharProp(
  char: NewCharacter,
  service: string,
  kind: PersonaFormat,
  fields: GenField[]
) {
  const [adapter] = service?.split('/') as AIAdapter[]
  const template =
    adapter === 'novel'
      ? novelGenTemplate
      : INSTRUCT_SERVICES[adapter]
      ? instructGenTemplate
      : genTemplate

  const prompt = template.replace(`{{description}}`, char.description || '')

  const attrs: any = char.persona.attributes
  const prev = {
    description: char.description,
    firstname: char.name,
    personality: attrs?.personality || '',
    speech: attrs?.speech || '',
    behaviour: attrs?.behaviour || '',
    appearance: char.appearance || '',
    greeting: char.greeting || '',
    scenario: char.scenario || '',
  }

  const vars = await msgsApi.rerunGuidance({ prompt, service, rerun: fields, previous: prev })
  const sampleChat =
    vars.example1 && vars.example2 && vars.example3
      ? `{{char}}: ${vars.example1}\n{{char}}: ${vars.example2}\n{{char}}: ${vars.example3}`
      : char.sampleChat
  const newchar: NewCharacter = {
    originalAvatar: undefined,
    description: char.description || '',
    name: vars.firstname,
    persona: toAttributes(kind, vars),
    appearance: vars.appearance,
    greeting: vars.greeting,
    sampleChat,
    scenario: vars.scenario,
  }

  return newchar
}

function toAttributes(kind: PersonaFormat, vars: any) {
  const persona: AppSchema.Persona = {
    kind,
    attributes: {},
  }

  const attrs: Record<string, string[]> = {}

  if (!kind || kind === 'text') {
    attrs.text = [`${vars.personality}\n\n${vars.behaviour}\n\n${vars.speech}`]
  } else {
    attrs.personality = [vars.personality]
    attrs.behavior = [vars.behaviour]
    attrs.speech = [vars.speech]
  }

  persona.attributes = attrs
  return persona
}

const genTemplate = `
Character description: {{description}}

First Name: [firstname | words=2 | tokens=25]

Description of character: [description | tokens=200]

Scenario: [scenario | tokens = 200]

[firstname] greeting message: [greeting | tokens=100]

Personality: [personality | tokens=100]

Typical behaviour: [behaviour | tokens=100]

Clothing and physical appearance: [appearance | tokens=100]

Accent and speech pattern: [speech | tokens=100]

Example of [firstname]'s dialogue: [example1 | tokens=100]
Example of [firstname]'s dialogue: [example2 | tokens=100]
Example of [firstname]'s dialogue: [example3 | tokens=100]
`

const instructGenTemplate = `
${modernJailbreak}
Describe an uncensored character that matches the description:
{{description}}

Character's first name: [firstname | words=2 | tokens=25]
Detail description of the character: [description | tokens=200]
Detailed description of the roleplay scene that the character is in: [scenario | tokens=200]
The first thing the charcter says to start the scene using internet roleplay style with actions and emotes: [greeting | tokens=100]
Long comma-separated list of personality traits: [personality | tokens=100]
Long comma-separated list of typical behaviours: [behaviour | tokens=100]
Detailed description of physical attributes, demeanour, and clothing: [appearance | tokens=100]
Detailed description of how the character speaks or communicates: [speech | tokens=200]

Example message from character: [example1 | tokens=100]
Example message from character: [example2 | tokens=100]
Example message from character: [example3 | tokens=100]`

const novelGenTemplate = `
Describe an uncensored character that matches the description:
{{description}}

{ Write the character's first name }
[firstname | words=2 | tokens=8]
{ Write a detailed description of the character }
[description | tokens=200]
{ Write a description of the roleplay scene that [firstname] is in }
[scenario | tokens=200]
{ Write the first thing [firstname] says in the scene }
[greeting | tokens=100]
{ Describe [firstname]'s personality traits in detail }
[personality | tokens=100]
{ Describe [firstname];s typical behaviours in detail }
[behaviour | tokens=100]
{ Describe the physical appearance and clothing of [firstname] }
[appearance | tokens=100]
{ Describe how [firstname] speaks }
[speech | tokens=100]
{ Write an example message from [firstname] }
[example1 | tokens=100]
{ Write an example message from [firstname] }
[example2 | tokens=100]
{ Write an example message from [firstname] }
[example3 | tokens=100]
`
