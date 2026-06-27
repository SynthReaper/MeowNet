// lib/veterinary/breedProfiles.ts
// Source: Cornell Feline Health Center, International Cat Care (icatcare.org)

export const BREED_PROFILES: Record<string, { conditions: string[]; note: string }> = {
  'Maine Coon':      { conditions: ['HCM', 'hip dysplasia'],             note: 'Regular cardiac screening recommended' },
  'Persian':         { conditions: ['brachycephalic issues', 'PKD'],      note: 'Daily grooming and eye cleaning needed' },
  'Siamese':         { conditions: ['dental disease', 'asthma'],          note: 'Vocal; high social needs' },
  'Scottish Fold':   { conditions: ['osteochondrodysplasia'],             note: 'Joint mobility monitoring important' },
  'Ragdoll':         { conditions: ['HCM', 'bladder stones'],             note: 'Regular heart screening advised' },
  'Bengal':          { conditions: ['PK deficiency', 'HCM'],              note: 'Active breed; needs enrichment' },
  'Birman':          { conditions: ['HCM'],                               note: 'Social, gentle temperament' },
  'British Shorthair':{ conditions: ['HCM', 'PKD'],                      note: 'Monitor weight; prone to obesity' },
  'Devon Rex':       { conditions: ['HCM', 'spasticity'],                 note: 'Sensitive skin; needs warmth' },
  'Sphynx':          { conditions: ['HCM', 'skin conditions'],            note: 'Regular bathing needed; cold-sensitive' },
  'Abyssinian':      { conditions: ['PK deficiency', 'renal amyloidosis'],note: 'Active; needs mental stimulation' },
  'Russian Blue':    { conditions: ['bladder stones'],                    note: 'Shy; slow to trust strangers' },
  'Norwegian Forest':{ conditions: ['HCM', 'GSD IV'],                    note: 'Outdoor-adapted; needs space' },
  'Burmese':         { conditions: ['cranial deformity', 'diabetes'],     note: 'People-oriented; vocal' },
  'Tonkinese':       { conditions: ['HCM'],                               note: 'Highly social; does not do well alone' },
  'Turkish Angora':  { conditions: ['deafness (white cats)', 'HCM'],      note: 'Active and intelligent' },
  'Domestic Shorthair': { conditions: [],                                 note: 'Generally hardy; mixed genetic background' },
  'Domestic Longhair':  { conditions: [],                                 note: 'Regular grooming to prevent matting' },
};

export function getBreedProfile(breed: string) {
  return BREED_PROFILES[breed] ?? null;
}
