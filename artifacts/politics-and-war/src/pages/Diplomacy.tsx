import { useState } from "react";
import { Link } from "wouter";
import { useListMessages, getListMessagesQueryKey, ListMessagesType } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { MessageSquare, Mail, Send, Reply, User } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { SendMessageDialog } from "@/components/SendMessageDialog";

function MessageList({ type }: { type: ListMessagesType }) {
  const { data: messages, isLoading } = useListMessages({ type });
  const [viewMessage, setViewMessage] = useState<any>(null);
  const [replyOpen, setReplyOpen] = useState(false);

  if (isLoading) {
    return <div className="space-y-4">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-20 w-full" />)}</div>;
  }

  if (!messages || messages.length === 0) {
    return (
      <div className="text-center p-12 bg-card border border-border rounded-sm">
        <Mail className="w-12 h-12 text-muted-foreground mx-auto mb-4 opacity-20" />
        <h3 className="text-xl font-bold font-mono uppercase tracking-widest text-muted-foreground">No Transmissions</h3>
        <p className="text-muted-foreground mt-2">Inbox empty.</p>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        {messages.map((msg) => (
          <Card 
            key={msg.id} 
            className={`bg-card border-border hover:border-primary/50 transition-colors cursor-pointer rounded-sm ${!msg.read && type === 'inbox' ? 'border-l-4 border-l-primary' : ''}`}
            onClick={() => setViewMessage(msg)}
          >
            <CardContent className="p-4 flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-muted/20 rounded-full shrink-0">
                  <User className="w-5 h-5 text-muted-foreground" />
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-foreground font-mono">
                      {type === 'inbox' ? msg.fromNationName : msg.toNationName}
                    </span>
                    {!msg.read && type === 'inbox' && (
                      <Badge variant="default" className="text-[10px] uppercase px-1 py-0 h-4">New</Badge>
                    )}
                  </div>
                  <div className="text-sm font-mono truncate max-w-[200px] md:max-w-md">{msg.subject}</div>
                </div>
              </div>
              <div className="text-xs text-muted-foreground font-mono whitespace-nowrap">
                {formatDistanceToNow(new Date(msg.createdAt), { addSuffix: true })}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!viewMessage} onOpenChange={(open) => !open && setViewMessage(null)}>
        <DialogContent className="sm:max-w-[600px] bg-card border-border">
          {viewMessage && (
            <>
              <DialogHeader className="border-b border-border pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <DialogTitle className="text-xl font-bold font-mono mb-2">{viewMessage.subject}</DialogTitle>
                    <DialogDescription className="font-mono text-xs flex flex-col gap-1">
                      <span>From: <Link href={`/nations/${viewMessage.fromNationId}`} className="text-primary hover:underline">{viewMessage.fromNationName}</Link></span>
                      <span>To: <Link href={`/nations/${viewMessage.toNationId}`} className="text-primary hover:underline">{viewMessage.toNationName}</Link></span>
                      <span className="text-muted-foreground">{new Date(viewMessage.createdAt).toLocaleString()}</span>
                    </DialogDescription>
                  </div>
                  <MessageSquare className="w-6 h-6 text-muted-foreground opacity-50" />
                </div>
              </DialogHeader>
              <div className="py-6 whitespace-pre-wrap font-mono text-sm leading-relaxed max-h-[400px] overflow-y-auto">
                {viewMessage.body}
              </div>
              <DialogFooter className="border-t border-border pt-4">
                <Button variant="outline" onClick={() => setViewMessage(null)} className="font-mono uppercase tracking-widest rounded-sm border-border mr-auto">
                  Close
                </Button>
                {type === 'inbox' && (
                  <Button onClick={() => setReplyOpen(true)} className="font-mono uppercase tracking-widest rounded-sm">
                    <Reply className="w-4 h-4 mr-2" /> Reply
                  </Button>
                )}
              </DialogFooter>

              {replyOpen && (
                <SendMessageDialog
                  targetNationId={viewMessage.fromNationId}
                  targetNationName={viewMessage.fromNationName}
                  replyToSubject={viewMessage.subject}
                  open={replyOpen}
                  onOpenChange={(open) => {
                    setReplyOpen(open);
                    if (!open) setViewMessage(null);
                  }}
                />
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}

export default function Diplomacy() {
  const [composeOpen, setComposeOpen] = useState(false);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight uppercase font-mono">Diplomatic Channels</h1>
          <p className="text-muted-foreground font-mono text-sm mt-1">Secure communication with foreign leaders.</p>
        </div>
        <Button onClick={() => setComposeOpen(true)} className="font-mono uppercase tracking-widest rounded-sm">
          <Send className="w-4 h-4 mr-2" /> Compose Message
        </Button>
      </div>

      <Card className="bg-card border-border rounded-sm">
        <Tabs defaultValue="inbox" className="w-full">
          <CardHeader className="border-b border-border bg-muted/20 pb-0">
            <TabsList className="bg-background border border-border rounded-sm mb-4">
              <TabsTrigger value="inbox" className="font-mono uppercase text-xs px-6">Inbox</TabsTrigger>
              <TabsTrigger value="sent" className="font-mono uppercase text-xs px-6">Sent</TabsTrigger>
            </TabsList>
          </CardHeader>
          
          <TabsContent value="inbox" className="m-0 p-4">
            <MessageList type="inbox" />
          </TabsContent>
          
          <TabsContent value="sent" className="m-0 p-4">
            <MessageList type="sent" />
          </TabsContent>
        </Tabs>
      </Card>

      {/* A generic compose requires a target nation ID, so we just show an error if they try to compose without a target, 
          or we could implement a nation search here. For now, guide them to nation profiles. */}
      <Dialog open={composeOpen} onOpenChange={setComposeOpen}>
        <DialogContent className="sm:max-w-[425px] bg-card border-border">
          <DialogHeader>
            <DialogTitle className="flex items-center text-primary font-mono uppercase tracking-widest text-lg">
              <Send className="w-5 h-5 mr-2" /> Compose Message
            </DialogTitle>
          </DialogHeader>
          <div className="py-6 text-center text-muted-foreground font-mono text-sm">
            To send a new message, please visit the <Link href="/nations" className="text-primary hover:underline">Global Registry</Link> or a specific Nation Profile to initiate a secure channel.
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setComposeOpen(false)} className="font-mono uppercase tracking-widest rounded-sm w-full">
              Acknowledged
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}