/**
 * @file XML utility functions for build commands
 */

import type { XmlElement, XmlNode } from "@oxen/xml";

/**
 * Set children of an XML element (immutable)
 */
export function setChildren(element: XmlElement, children: XmlNode[]): XmlElement {
  return { ...element, children };
}
