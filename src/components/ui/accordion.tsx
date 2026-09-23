import * as React from 'react'
import { Accordion as AccordionPrimitive } from 'radix-ui'
import { ChevronDown } from 'lucide-react'

import { cn } from '@/lib/utils'

function Accordion({
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Root>) {
  return <AccordionPrimitive.Root data-slot="accordion" {...props} />
}

function AccordionItem({
  className,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Item>) {
  return (
    <AccordionPrimitive.Item
      data-slot="accordion-item"
      className={cn('border-b border-divider last:border-b-0', className)}
      {...props}
    />
  )
}

function AccordionTrigger({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Trigger>) {
  return (
    <AccordionPrimitive.Header className="flex">
      <AccordionPrimitive.Trigger
        data-slot="accordion-trigger"
        className={cn(
          // `text-left` and `min-w-0`: a heading is a sentence somebody typed,
          // not a label, so it wraps rather than deciding the panel's width.
          'flex min-w-0 flex-1 cursor-pointer items-start justify-between gap-3.5 px-4.5 py-3.5 text-left text-sm font-medium outline-none transition-colors hover:bg-ui-line focus-visible:bg-ui-line disabled:pointer-events-none [&[data-state=open]>svg]:rotate-180',
          className,
        )}
        {...props}
      >
        {children}
        <ChevronDown
          className="mt-0.5 size-4 flex-none text-muted-foreground transition-transform duration-200"
          strokeWidth={2}
        />
      </AccordionPrimitive.Trigger>
    </AccordionPrimitive.Header>
  )
}

function AccordionContent({
  className,
  children,
  ...props
}: React.ComponentProps<typeof AccordionPrimitive.Content>) {
  return (
    <AccordionPrimitive.Content
      data-slot="accordion-content"
      // The height variable is Radix's own, measured for the panel it opens.
      className="overflow-hidden data-open:animate-ems-open data-closed:animate-ems-shut"
      {...props}
    >
      <div className={cn('px-4.5 pt-0 pb-4.5', className)}>{children}</div>
    </AccordionPrimitive.Content>
  )
}

export { Accordion, AccordionContent, AccordionItem, AccordionTrigger }
