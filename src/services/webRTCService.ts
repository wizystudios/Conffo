import { supabase } from '@/integrations/supabase/client';

export interface CallSignal {
  type: 'offer' | 'answer' | 'ice-candidate' | 'end-call';
  data: any;
  from: string;
  to: string;
  callId: string;
}

export class WebRTCService {
  private pc: RTCPeerConnection | null = null;
  private localStream: MediaStream | null = null;
  private channel: any = null;
  private callId: string = '';
  
  constructor(
    private userId: string,
    private onRemoteStream: (stream: MediaStream) => void,
    private onCallEnd: () => void
  ) {}

  async initializeCall(targetUserId: string, callType: 'audio' | 'video'): Promise<string> {
    this.callId = `call_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Subscribe to call signals
    this.channel = supabase
      .channel(`call_${this.callId}`)
      .on('broadcast', { event: 'call_signal' }, (payload) => {
        this.handleSignal(payload.payload as CallSignal);
      })
      .subscribe();

    // Get user media
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: callType === 'video',
      audio: true
    });

    // Create peer connection
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream
    this.localStream.getTracks().forEach(track => {
      if (this.pc && this.localStream) {
        this.pc.addTrack(track, this.localStream);
      }
    });

    // Handle remote stream
    this.pc.ontrack = (event) => {
      this.onRemoteStream(event.streams[0]);
    };

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'ice-candidate',
          data: event.candidate,
          from: this.userId,
          to: targetUserId,
          callId: this.callId
        });
      }
    };

    // Create offer
    const offer = await this.pc.createOffer();
    await this.pc.setLocalDescription(offer);

    // Send offer
    this.sendSignal({
      type: 'offer',
      data: offer,
      from: this.userId,
      to: targetUserId,
      callId: this.callId
    });

    return this.callId;
  }

  async answerCall(callId: string, signal: CallSignal): Promise<void> {
    this.callId = callId;
    
    // Subscribe to call signals
    this.channel = supabase
      .channel(`call_${this.callId}`)
      .on('broadcast', { event: 'call_signal' }, (payload) => {
        this.handleSignal(payload.payload as CallSignal);
      })
      .subscribe();

    // Get user media
    this.localStream = await navigator.mediaDevices.getUserMedia({
      video: true, // Default to video for incoming calls
      audio: true
    });

    // Create peer connection
    this.pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });

    // Add local stream
    this.localStream.getTracks().forEach(track => {
      if (this.pc && this.localStream) {
        this.pc.addTrack(track, this.localStream);
      }
    });

    // Handle remote stream
    this.pc.ontrack = (event) => {
      this.onRemoteStream(event.streams[0]);
    };

    // Handle ICE candidates
    this.pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.sendSignal({
          type: 'ice-candidate',
          data: event.candidate,
          from: this.userId,
          to: signal.from,
          callId: this.callId
        });
      }
    };

    // Set remote description and create answer
    await this.pc.setRemoteDescription(signal.data);
    const answer = await this.pc.createAnswer();
    await this.pc.setLocalDescription(answer);

    // Send answer
    this.sendSignal({
      type: 'answer',
      data: answer,
      from: this.userId,
      to: signal.from,
      callId: this.callId
    });
  }

  private async handleSignal(signal: CallSignal) {
    if (!this.pc) return;

    try {
      switch (signal.type) {
        case 'answer':
          await this.pc.setRemoteDescription(signal.data);
          break;
        case 'ice-candidate':
          await this.pc.addIceCandidate(signal.data);
          break;
        case 'end-call':
          this.endCall();
          break;
      }
    } catch (error) {
      console.error('Error handling signal:', error);
    }
  }

  private sendSignal(signal: CallSignal) {
    if (this.channel) {
      this.channel.send({
        type: 'broadcast',
        event: 'call_signal',
        payload: signal
      });
    }
  }

  toggleMute(): boolean {
    if (this.localStream) {
      const audioTrack = this.localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        return !audioTrack.enabled;
      }
    }
    return false;
  }

  toggleVideo(): boolean {
    if (this.localStream) {
      const videoTrack = this.localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        return !videoTrack.enabled;
      }
    }
    return false;
  }

  getLocalStream(): MediaStream | null {
    return this.localStream;
  }

  endCall() {
    // Send end call signal
    this.sendSignal({
      type: 'end-call',
      data: null,
      from: this.userId,
      to: '',
      callId: this.callId
    });

    // Clean up
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = null;
    }

    if (this.pc) {
      this.pc.close();
      this.pc = null;
    }

    if (this.channel) {
      supabase.removeChannel(this.channel);
      this.channel = null;
    }

    this.onCallEnd();
  }
}