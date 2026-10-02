import { useQuery } from '@tanstack/react-query'
import { usersService } from '@/api/users/service'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { initialsOfName } from '@/features/profile/record'
import { photoSource } from '@/lib/photo-url'
import { cn } from '@/lib/utils'

/**
 * A person's photograph, or their initials where there is none.
 *
 * The initials are not only for somebody who never had a photo taken: they are
 * what shows while the picture loads, and what stays if the school cannot hand
 * it over — a filename the school holds but no longer serves is a broken image
 * otherwise, which is the one thing a record page must not open on. Radix
 * decides between the two by whether the image actually loaded, not by
 * whether there was a filename to ask for.
 */
export function PersonAvatar({
  name,
  photo,
  initials,
  className,
  fallbackClassName,
}: {
  /** The name as the page writes it; the initials are taken from it. */
  name: string
  /** The photo as a row keeps it — see `staffPhoto` and `studentPhoto`. */
  photo?: string
  /** Where the caller already worked them out from the halves of the name. */
  initials?: string
  className?: string
  fallbackClassName?: string
}) {
  const src = usePhotoSrc(photo)
  return (
    <Avatar className={cn('size-16', className)}>
      {src && <AvatarImage src={src} alt={`Photo of ${name}`} />}
      <AvatarFallback
        className={cn(
          'bg-brand/10 font-heading text-lg font-extrabold text-brand-700',
          fallbackClassName,
        )}
      >
        {initials ?? initialsOfName(name)}
      </AvatarFallback>
    </Avatar>
  )
}

/**
 * The address to hand the `<img>`: a public one as it stands, or — for a
 * student, whose folder is behind the school website's login — the file
 * fetched with the token and held in memory.
 *
 * A plain `useQuery`, and on purpose: a photograph is a picture beside a
 * record, not a record, and there is nothing for a collection to hold. With no
 * connection it fails, and the initials are what shows — which is the answer
 * the device has anyway. `networkMode: 'always'` for that reason: paused, it
 * would never fail, and the query would sit pending over the initials forever.
 *
 * The object URL is made once per photo and kept for the session rather than
 * released on unmount. Released on unmount, StrictMode's second effect pass
 * revokes it under the image that is showing it; kept, the cost is one small
 * picture in memory per student opened.
 */
function usePhotoSrc(photo: string | undefined): string | undefined {
  const source = photoSource(photo)
  const download = source && 'download' in source ? source.download : undefined
  const fetched = useQuery({
    queryKey: ['photo', download],
    queryFn: async () => URL.createObjectURL(await usersService.download(download!)),
    enabled: Boolean(download),
    staleTime: Infinity,
    gcTime: Infinity,
    retry: false,
    // No toast on failure — queries raise none, and a missing photo is not
    // news anyway: the initials already say so.
    networkMode: 'always',
  })
  return source && 'url' in source ? source.url : fetched.data
}
