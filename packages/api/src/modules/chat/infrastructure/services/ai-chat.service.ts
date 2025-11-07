import { Injectable } from '@nestjs/common';

/**
 * AI Chat Service
 * 
 * TODO: Integrate with external AI server API
 * This service currently returns mock data. In production, this should:
 * 1. Send user messages to the external AI server
 * 2. Receive and process AI responses
 * 3. Handle error cases and retries
 * 4. Manage streaming responses if needed
 */
@Injectable()
export class AiChatService {
  /**
   * Generate AI response (currently returns mock data)
   * 
   * TODO: Replace with actual AI server API call
   * Expected implementation:
   * - POST request to AI server with message and context
   * - Include paperId if available for paper-specific queries
   * - Handle authentication with AI server
   * - Process streaming or batch responses
   */
  async generateResponse(userMessage: string, paperId?: string): Promise<string> {
    // TODO: Implement actual AI server integration
    // const response = await this.aiServerClient.post('/chat', {
    //   message: userMessage,
    //   paperId: paperId,
    //   context: ...
    // });
    // return response.data.content;

    // Mock response for development
    return '죄송합니다. AI 서버와 연결되지 않았습니다. 이 기능은 곧 활성화될 예정입니다. ' +
           `(사용자 메시지: "${userMessage.substring(0, 30)}...")`;
  }
}



