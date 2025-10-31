import { defineType } from 'sanity'

/**
 * SOPHIE'S CONVERSATION ANALYSIS
 * ===============================
 * Sophie's working memory - stores her analysis of every conversation
 * Quality scores, issues identified, suggested improvements
 * This builds up over time as she learns what good/bad looks like
 */

export const sophieAnalysis = defineType({
  name: 'sophieAnalysis',
  title: 'Sophie Conversation Analysis',
  type: 'document',
  fields: [
    {
      name: 'lead',
      title: 'Lead Reference',
      type: 'reference',
      to: [{ type: 'dbrLead' }],
      description: 'The conversation being analyzed',
      validation: (Rule) => Rule.required(),
    },

    {
      name: 'qualityScore',
      title: 'Quality Score',
      type: 'number',
      description: '0-100% - How good was this conversation?',
      validation: (Rule) => Rule.required().min(0).max(100),
    },

    {
      name: 'analysisDate',
      title: 'Analysis Date',
      type: 'datetime',
      description: 'When Sophie analyzed this conversation',
      initialValue: () => new Date().toISOString(),
    },

    {
      name: 'status',
      title: 'Review Status',
      type: 'string',
      options: {
        list: [
          { title: '⏳ Pending Review', value: 'pending_review' },
          { title: '👀 Under Review', value: 'under_review' },
          { title: '✅ Reviewed & Learned', value: 'reviewed' },
          { title: '📝 Needs More Info', value: 'needs_info' },
          { title: '❌ Dismissed', value: 'dismissed' },
        ],
      },
      initialValue: 'pending_review',
    },

    {
      name: 'priority',
      title: 'Priority Level',
      type: 'string',
      description: 'How urgently should this be reviewed?',
      options: {
        list: [
          { title: '🔴 CRITICAL - Major Issue', value: 'critical' },
          { title: '🟠 HIGH - Should Review Soon', value: 'high' },
          { title: '🟡 MEDIUM - When You Can', value: 'medium' },
          { title: '🟢 LOW - Minor Improvement', value: 'low' },
        ],
      },
      initialValue: 'medium',
    },

    {
      name: 'issuesIdentified',
      title: 'Issues Identified',
      type: 'array',
      description: 'What went wrong in this conversation',
      of: [{
        type: 'object',
        fields: [
          {
            name: 'issueType',
            title: 'Issue Type',
            type: 'string',
            options: {
              list: [
                { title: '🚫 Wrong Response', value: 'wrong_response' },
                { title: '⏹️ Should Have Stopped', value: 'should_stop' },
                { title: '📅 Missed Booking Opportunity', value: 'missed_booking' },
                { title: '💰 Poor Price Objection Handling', value: 'bad_price_handling' },
                { title: '⏰ Poor Timing Objection Handling', value: 'bad_timing_handling' },
                { title: '🔒 Failed Trust Building', value: 'trust_issue' },
                { title: '📏 Message Too Long', value: 'too_long' },
                { title: '📏 Message Too Short', value: 'too_short' },
                { title: '🎯 Lost Context', value: 'lost_context' },
                { title: '😐 Wrong Tone', value: 'wrong_tone' },
                { title: '🔁 Repetitive', value: 'repetitive' },
                { title: '❓ Didn\'t Answer Question', value: 'didnt_answer' },
                { title: '⚡ Too Pushy', value: 'too_pushy' },
                { title: '🐌 Not Assertive Enough', value: 'not_assertive' },
              ],
            },
          },
          {
            name: 'messageIndex',
            title: 'Which Message',
            type: 'number',
            description: 'Which message in the conversation (1-based)',
          },
          {
            name: 'explanation',
            title: 'What Was Wrong',
            type: 'text',
            rows: 2,
          },
          {
            name: 'actualResponse',
            title: 'What AI Actually Said',
            type: 'text',
            rows: 2,
          },
          {
            name: 'suggestedResponse',
            title: 'What AI Should Have Said',
            type: 'text',
            rows: 3,
          },
        ],
      }],
    },

    {
      name: 'overallAssessment',
      title: 'Overall Assessment',
      type: 'text',
      description: 'Sophie\'s summary of the conversation',
      rows: 4,
    },

    {
      name: 'keyTakeaways',
      title: 'Key Takeaways',
      type: 'array',
      description: 'Main lessons from this conversation',
      of: [{ type: 'string' }],
    },

    {
      name: 'userFeedback',
      title: 'Your Feedback',
      type: 'text',
      description: 'What you said during review',
      rows: 3,
    },

    {
      name: 'agreedWithSophie',
      title: 'Did You Agree with Sophie?',
      type: 'boolean',
      description: 'Did you agree with Sophie\'s analysis?',
    },

    {
      name: 'learningsCreated',
      title: 'Learnings Created',
      type: 'array',
      description: 'Links to sophieLearning entries created from this review',
      of: [{
        type: 'reference',
        to: [{ type: 'sophieLearning' }],
      }],
    },

    {
      name: 'appliedLearningIds',
      title: 'Applied Learning IDs',
      type: 'array',
      description: 'IDs of learnings that were active when this analysis was done (for version control)',
      of: [{ type: 'string' }],
    },

    {
      name: 'analysisVersion',
      title: 'Analysis Version',
      type: 'number',
      description: 'Version number based on count of learnings at analysis time',
      initialValue: 0,
    },

    {
      name: 'conversationSnapshot',
      title: 'Conversation Snapshot',
      type: 'text',
      description: 'Full conversation at time of analysis (for reference)',
      rows: 10,
    },

    {
      name: 'metadata',
      title: 'Metadata',
      type: 'object',
      fields: [
        {
          name: 'leadName',
          title: 'Lead Name',
          type: 'string',
        },
        {
          name: 'leadStatus',
          title: 'Lead Status',
          type: 'string',
        },
        {
          name: 'messageCount',
          title: 'Total Messages',
          type: 'number',
        },
        {
          name: 'lastMessageDate',
          title: 'Last Message Date',
          type: 'string',
        },
      ],
    },
  ],

  preview: {
    select: {
      score: 'qualityScore',
      priority: 'priority',
      status: 'status',
      leadName: 'metadata.leadName',
      issueCount: 'issuesIdentified',
    },
    prepare({ score, priority, status, leadName, issueCount }: {
      score: number;
      priority: string;
      status: string;
      leadName: string;
      issueCount: any[];
    }) {
      const priorityEmoji: Record<string, string> = {
        'critical': '🔴',
        'high': '🟠',
        'medium': '🟡',
        'low': '🟢',
      }

      const statusEmoji: Record<string, string> = {
        'pending_review': '⏳',
        'under_review': '👀',
        'reviewed': '✅',
        'needs_info': '📝',
        'dismissed': '❌',
      }

      const scoreEmoji = score >= 80 ? '✅' : score >= 60 ? '⚠️' : '🚨'
      const issues = Array.isArray(issueCount) ? issueCount.length : 0

      return {
        title: `${scoreEmoji} ${score}% - ${leadName || 'Unknown Lead'}`,
        subtitle: `${priorityEmoji[priority] || '🟡'} ${statusEmoji[status] || ''} ${issues} issue${issues !== 1 ? 's' : ''} identified`,
      }
    },
  },

  orderings: [
    {
      title: 'Lowest Quality First',
      name: 'quality_asc',
      by: [
        { field: 'qualityScore', direction: 'asc' },
        { field: 'analysisDate', direction: 'desc' },
      ],
    },
    {
      title: 'Highest Priority First',
      name: 'priority_desc',
      by: [
        { field: 'priority', direction: 'asc' },
        { field: 'qualityScore', direction: 'asc' },
      ],
    },
    {
      title: 'Most Recent',
      name: 'recent',
      by: [{ field: 'analysisDate', direction: 'desc' }],
    },
    {
      title: 'Pending Review',
      name: 'pending',
      by: [
        { field: 'status', direction: 'asc' },
        { field: 'qualityScore', direction: 'asc' },
      ],
    },
  ],
})
