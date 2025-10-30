import { defineType } from 'sanity'

/**
 * SOPHIE CHAT MESSAGES
 * ====================
 * Stores the conversation history between users and Sophie.
 * This allows Sophie to maintain context and learn from past interactions.
 */

export const sophieChat = defineType({
  name: 'sophieChat',
  title: 'Sophie Chat History',
  type: 'document',
  fields: [
    {
      name: 'sender',
      title: 'Sender',
      type: 'string',
      description: 'Who sent this message',
      options: {
        list: [
          { title: '🧠 Sophie (AI)', value: 'sophie' },
          { title: '👤 User', value: 'user' },
        ],
      },
      validation: (Rule) => Rule.required(),
    },

    {
      name: 'userName',
      title: 'User Name',
      type: 'string',
      description: 'Name of the user (if sender is user)',
      options: {
        list: [
          { title: 'JJ', value: 'JJ' },
          { title: 'Jacob', value: 'Jacob' },
          { title: 'Oliver', value: 'Oliver' },
        ],
      },
    },

    {
      name: 'message',
      title: 'Message',
      type: 'text',
      description: 'The message content',
      rows: 4,
      validation: (Rule) => Rule.required(),
    },

    {
      name: 'relatedConversation',
      title: 'Related Conversation',
      type: 'reference',
      to: [{ type: 'dbrLead' }],
      description: 'If this chat is about a specific conversation',
    },

    {
      name: 'relatedLearning',
      title: 'Generated Learning',
      type: 'reference',
      to: [{ type: 'sophieLearning' }],
      description: 'If this chat resulted in a learning log entry',
    },

    {
      name: 'sessionId',
      title: 'Session ID',
      type: 'string',
      description: 'Groups messages from the same chat session',
    },

    {
      name: 'metadata',
      title: 'Metadata',
      type: 'object',
      description: 'Additional context for this message',
      fields: [
        {
          name: 'category',
          title: 'Category',
          type: 'string',
          description: 'What this chat is about',
        },
        {
          name: 'intent',
          title: 'Intent',
          type: 'string',
          description: 'What the user is trying to achieve',
        },
        {
          name: 'actionTaken',
          title: 'Action Taken',
          type: 'boolean',
          description: 'Did Sophie save a learning from this?',
        },
      ],
    },

    {
      name: 'timestamp',
      title: 'Timestamp',
      type: 'datetime',
      description: 'When this message was sent',
      validation: (Rule) => Rule.required(),
    },
  ],

  preview: {
    select: {
      sender: 'sender',
      userName: 'userName',
      message: 'message',
      timestamp: 'timestamp',
    },
    prepare({ sender, userName, message, timestamp }) {
      const icon = sender === 'sophie' ? '🧠' : '👤'
      const name = sender === 'sophie' ? 'Sophie' : userName || 'User'
      const preview = message ? message.substring(0, 60) + (message.length > 60 ? '...' : '') : ''
      const time = timestamp ? new Date(timestamp).toLocaleString() : ''

      return {
        title: `${icon} ${name}: ${preview}`,
        subtitle: time,
      }
    },
  },

  orderings: [
    {
      title: 'Most Recent',
      name: 'recent',
      by: [{ field: 'timestamp', direction: 'desc' }],
    },
    {
      title: 'By Session',
      name: 'session',
      by: [
        { field: 'sessionId', direction: 'desc' },
        { field: 'timestamp', direction: 'asc' },
      ],
    },
  ],
})
