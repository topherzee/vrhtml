vrhtml.js
======

Virtual Reality HTML.
Render HTML DOM in 3D for the Oculus Rift or other virtual reality glasses.

If you would like to create and experience an immersive  3D HTML 'website' based on standard HTML elements such as Div's, Links and Forms, then this library can help you.
If you are mainly interested in rendering VR 3D with top performance, then you should probably skip this and use the existing OculusRiftEffect.js library and an OpenGL renderer like the StereoRenderer that is part of the vr.js library.

Concretely - given the ID of an element, this library will display the contents of that element as a "stereo pair" of slightly spatially offset renderings, and will transform those two displays in response to the motion tracking of an Oculus Rift (or similar) or mouse movements. The user can callibrate the offset of the stereo pair to match their eyes with the O and P keys.
 
vrhtml depends on three.js and associated libraries: TrackballControls.js and CSS3DRenderer.
To access the Oculus Rift head-tracking information from the browser (eg orientation) I recommend the npvr browser plugin and vr.js library. https://github.com/benvanik/vr.js

I have included the mentioned dependencies in the libs directory to make it easy for someone to get started, but definitely you'll want to check out those projects.

## Current implementation / Rational:
WebGL cannot be used because the goal was not just to render 3D in the browser, but to render 3D html. So CSS 3D is the answer, and in three.js that means CSS3DRenderer.
The CSS3DRenderer displays actual dom elements, not some rastered rendering, so for each eye view we need the full dom structure. This means the displayed DOM elements have to exist twice on the page! To change the eye separation (inter-ocular distance) in an easy to implement and understand way, each eye is simply rendered into a side by side pair of div's with overflow hidden. So the divs can simply be shifted left and right to match the each users physical eye distance.
The DOM the user specifies is cloned twice and added to two three.js scenes. It works. 

This double-dom is problematic. If you want to animate or change the DOM you have to do it in both scenes. They will always need to be synced.
I could see dealing with this by using something like React.js framework that works with a "virtual dom" and then just hooking that up to the two scenes.

Maybe a future implementation could render two views of one CSS3DRenderer to display buffers and the user would just see these images side by side on a Canvas element?

I welcome all collaboration, forks, alternative examples! Have fun!

## Future
This is a start. There are improvements to be made.
 * VR rotation tracking should be relative - so view can always start out normal, regardless of head orientation, and so that
 * Mouse and VR head tracking can be used together.
 * Its a shame that the 'eye masks' make it so that some visuals on far left and right are cut off.
* Automatic handling of displaying both "eyes", if dom of one changes, the other automatically syncs.
