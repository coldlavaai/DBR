import { defineType } from 'sanity'

/**
 * SOPHIE'S LEARNING LOG
 * =====================
 * This stores all the accumulated knowledge from JJ/Jacob's training sessions.
 * Sophie uses this to learn the "correct way" to handle different situations.
 *
 * Examples:
 * - How to handle price objections
 * - How to respond to timing concerns
 * - What language to use for trust building
 * - Specific phrases to use/avoid
 */

export const sophieLearning = defineType({
  name: 'sophieLearning',
  title: 'Sophie Learning Log',
  type: 'document',
  fields: [
    {
      name: 'category',
      title: 'Category',
      type: 'string',
      description: 'Type of objection or conversation scenario',
      options: {
        list: [
          { title: '💰 Price Objection', value: 'price_objection' },
          { title: '⏰ Timing Objection', value: 'timing_objection' },
          { title: '🤔 Interest Signal', value: 'interest_signal' },
          { title: '🔒 Trust/Legitimacy Concern', value: 'trust_concern' },
          { title: '🎯 Context Maintenance', value: 'context_maintenance' },
          { title: '📝 Message Length/Tone', value: 'message_style' },
          { title: '🔄 Follow-up Strategy', value: 'followup_strategy' },
          { title: '🌟 General Ethos', value: 'general_ethos' },
          { title: '🎨 Other', value: 'other' },
        ],
      },
      validation: (Rule) => Rule.required(),
    },

    {
      name: 'title',
      title: 'Title',
      type: 'string',
      description: 'Short summary of this learning',
      validation: (Rule) => Rule.required().max(100),
    },

    {
      name: 'userGuidance',
      title: 'User Guidance',
      type: 'text',
      description: 'What JJ/Jacob said about how to handle this',
      rows: 4,
      validation: (Rule) => Rule.required(),
    },

    {
      name: 'doThis',
      title: '✅ Do This (Correct Approach)',
      type: 'text',
      description: 'The correct way to handle this situation',
      rows: 3,
    },

    {
      name: 'dontDoThis',
      title: '❌ Don\'t Do This (Things to Avoid)',
      type: 'text',
      description: 'What NOT to do in this situation',
      rows: 3,
    },

    {
      name: 'exampleResponses',
      title: 'Example Responses',
      type: 'array',
      description: 'Specific example messages that work well',
      of: [{
        type: 'object',
        fields: [
          {
            name: 'scenario',
            title: 'Scenario',
            type: 'string',
            description: 'What the lead said',
          },
          {
            name: 'response',
            title: 'Good Response',
            type: 'text',
            rows: 2,
            description: 'How we should respond',
          },
        ],
      }],
    },

    {
      name: 'conversationExamples',
      title: 'Real Conversation Examples',
      type: 'array',
      description: 'Links to actual conversations that demonstrate this',
      of: [{
        type: 'reference',
        to: [{ type: 'dbrLead' }],
      }],
    },

    {
      name: 'priority',
      title: 'Priority',
      type: 'string',
      description: 'How important is this rule?',
      options: {
        list: [
          { title: '🔥 Critical - Never Break', value: 'critical' },
          { title: '⚠️ High - Very Important', value: 'high' },
          { title: '📊 Medium - Best Practice', value: 'medium' },
          { title: '💡 Low - Nice to Have', value: 'low' },
        ],
      },
      initialValue: 'medium',
    },

    {
      name: 'tags',
      title: 'Tags',
      type: 'array',
      description: 'Additional tags for organization',
      of: [{ type: 'string' }],
      options: {
        layout: 'tags',
      },
    },

    {
      name: 'notes',
      title: 'Additional Notes',
      type: 'text',
      description: 'Any other context or details',
      rows: 2,
    },

    {
      name: 'createdBy',
      title: 'Created By',
      type: 'string',
      description: 'Who provided this guidance',
      options: {
        list: [
          { title: 'JJ', value: 'JJ' },
          { title: 'Jacob', value: 'Jacob' },
          { title: 'Oliver', value: 'Oliver' },
          { title: 'Sophie (AI)', value: 'Sophie' },
        ],
      },
    },

    {
      name: 'lastUpdated',
      title: 'Last Updated',
      type: 'datetime',
      description: 'When this learning was last modified',
      readOnly: true,
    },

    // NEW: v2.0 Confidence & Tracking Fields
    {
      name: 'confidenceScore',
      title: 'Confidence Score',
      type: 'number',
      description: 'How confident Sophie is in this learning (0.0-1.0)',
      initialValue: 1.0,
      validation: (Rule) => Rule.min(0).max(1),
    },

    {
      name: 'timesApplied',
      title: 'Times Applied',
      type: 'number',
      description: 'How many times this learning was used in analyses',
      initialValue: 0,
    },

    {
      name: 'timesCorrect',
      title: 'Times Correct',
      type: 'number',
      description: 'How many times this learning led to correct analysis',
      initialValue: 0,
    },

    {
      name: 'timesIncorrect',
      title: 'Times Incorrect',
      type: 'number',
      description: 'How many times this learning led to mistakes',
      initialValue: 0,
    },

    {
      name: 'version',
      title: 'Version',
      type: 'number',
      description: 'Version number of this learning',
      initialValue: 1,
    },

    {
      name: 'isActive',
      title: 'Is Active',
      type: 'boolean',
      description: 'Whether this learning is currently active (or archived)',
      initialValue: true,
    },

    {
      name: 'isHardRule',
      title: 'Is Hard Rule',
      type: 'boolean',
      description: 'Whether this has graduated to an unbreakable hard rule (taught 3+ times)',
      initialValue: false,
    },

    {
      name: 'timesReinforced',
      title: 'Times Reinforced',
      type: 'number',
      description: 'How many times user has taught this same lesson (auto-promotes to hard rule at 3)',
      initialValue: 1,
    },

    {
      name: 'source',
      title: 'Source',
      type: 'string',
      description: 'How this learning was created',
      options: {
        list: [
          { title: '✅ User Agreed', value: 'user_agreed' },
          { title: '💬 Teaching Dialogue', value: 'teaching_dialogue' },
          { title: '🔄 Consolidated', value: 'consolidated' },
        ],
      },
    },

    {
      name: 'originalIssue',
      title: 'Original Issue Type',
      type: 'string',
      description: 'The issue type that triggered this learning',
    },

    {
      name: 'dialogueTranscript',
      title: 'Dialogue Transcript',
      type: 'array',
      description: 'Full teaching conversation (if from teaching dialogue)',
      of: [{ type: 'object', fields: [
        { name: 'role', type: 'string' },
        { name: 'message', type: 'text' },
        { name: 'timestamp', type: 'datetime' },
      ]}],
    },

    {
      name: 'supersededBy',
      title: 'Superseded By',
      type: 'reference',
      to: [{ type: 'sophieLearning' }],
      description: 'If archived, which learning replaced this',
    },

    {
      name: 'consolidatedFrom',
      title: 'Consolidated From',
      type: 'array',
      description: 'If this is a meta-learning, which learnings were merged',
      of: [{ type: 'string' }],
    },
  ],

  preview: {
    select: {
      title: 'title',
      category: 'category',
      priority: 'priority',
      createdBy: 'createdBy',
    },
    prepare({ title, category, priority, createdBy }: {
      title: string;
      category: string;
      priority: string;
      createdBy: string;
    }) {
      const categoryEmoji: Record<string, string> = {
        'price_objection': '💰',
        'timing_objection': '⏰',
        'interest_signal': '🤔',
        'trust_concern': '🔒',
        'context_maintenance': '🎯',
        'message_style': '📝',
        'followup_strategy': '🔄',
        'general_ethos': '🌟',
        'other': '🎨',
      }

      const priorityEmoji: Record<string, string> = {
        'critical': '🔥',
        'high': '⚠️',
        'medium': '📊',
        'low': '💡',
      }

      return {
        title: `${categoryEmoji[category] || '📚'} ${title}`,
        subtitle: `${priorityEmoji[priority] || '📊'} ${priority ? priority.toUpperCase() : 'MEDIUM'}${createdBy ? ` • by ${createdBy}` : ''}`,
      }
    },
  },

  orderings: [
    {
      title: 'Priority (Critical First)',
      name: 'priority',
      by: [
        { field: 'priority', direction: 'asc' },
        { field: 'lastUpdated', direction: 'desc' },
      ],
    },
    {
      title: 'Most Recent',
      name: 'recent',
      by: [{ field: 'lastUpdated', direction: 'desc' }],
    },
    {
      title: 'Category',
      name: 'category',
      by: [
        { field: 'category', direction: 'asc' },
        { field: 'priority', direction: 'asc' },
      ],
    },
  ],
})
