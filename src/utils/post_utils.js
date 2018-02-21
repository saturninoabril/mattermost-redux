// Copyright (c) 2016-present Mattermost, Inc. All Rights Reserved.
// See License.txt for license information.

import {General, Posts, Preferences} from 'constants';

import {getPreferenceKey} from './preference_utils';

export function isPostFlagged(postId, myPreferences) {
    const key = getPreferenceKey(Preferences.CATEGORY_FLAGGED_POST, postId);
    return myPreferences.hasOwnProperty(key);
}

export function isSystemMessage(post) {
    return post.type !== '' && post.type && post.type.startsWith(Posts.SYSTEM_MESSAGE_PREFIX);
}

export function isFromWebhook(post) {
    return post.props && post.props.from_webhook;
}

export function isPostEphemeral(post) {
    return post.type === Posts.POST_TYPES.EPHEMERAL || post.state === Posts.POST_DELETED;
}

export function shouldIgnorePost(post) {
    return Posts.IGNORE_POST_TYPES.includes(post.type);
}

export function isPostOwner(userId, post) {
    return userId === post.user_id;
}

export function isEdited(post) {
    return post.edit_at > 0;
}

export function canDeletePost(config, license, userId, post, isAdmin, isSystemAdmin) {
    const isOwner = isPostOwner(userId, post);

    if (license.IsLicensed === 'true') {
        return (config.RestrictPostDelete === General.PERMISSIONS_ALL && (isOwner || isAdmin)) ||
            (config.RestrictPostDelete === General.PERMISSIONS_TEAM_ADMIN && isAdmin) ||
            (config.RestrictPostDelete === General.PERMISSIONS_SYSTEM_ADMIN && isSystemAdmin);
    }
    return isOwner || isAdmin;
}

export function canEditPost(config, license, userId, post, editDisableAction) {
    const isOwner = isPostOwner(userId, post);
    let canEdit = isOwner && !isSystemMessage(post);

    if (canEdit && license.IsLicensed === 'true') {
        if (config.AllowEditPost === General.ALLOW_EDIT_POST_NEVER) {
            canEdit = false;
        } else if (config.AllowEditPost === General.ALLOW_EDIT_POST_TIME_LIMIT) {
            const timeLeft = (post.create_at + (config.PostEditTimeLimit * 1000)) - Date.now();
            if (timeLeft > 0) {
                editDisableAction.fireAfter(timeLeft + 1000);
            } else {
                canEdit = false;
            }
        }
    }
    return canEdit;
}

export function getLastCreateAt(postsArray) {
    const createAt = postsArray.map((p) => p.create_at);

    if (createAt.length) {
        return Reflect.apply(Math.max, null, createAt);
    }

    return 0;
}

const joinLeavePostTypes = [
    Posts.POST_TYPES.JOIN_LEAVE,
    Posts.POST_TYPES.JOIN_CHANNEL,
    Posts.POST_TYPES.LEAVE_CHANNEL,
    Posts.POST_TYPES.ADD_REMOVE,
    Posts.POST_TYPES.ADD_TO_CHANNEL,
    Posts.POST_TYPES.REMOVE_FROM_CHANNEL,
    Posts.POST_TYPES.JOIN_TEAM,
    Posts.POST_TYPES.LEAVE_TEAM,
    Posts.POST_TYPES.ADD_TO_TEAM,
    Posts.POST_TYPES.REMOVE_FROM_TEAM
];

// Returns true if a post should be hidden when the user has Show Join/Leave Messages disabled
export function shouldFilterJoinLeavePost(post, showJoinLeave, currentUsername) {
    if (showJoinLeave) {
        return false;
    }

    // Don't filter out non-join/leave messages
    if (joinLeavePostTypes.indexOf(post.type) === -1) {
        return false;
    }

    // Don't filter out join/leave messages about the current user
    if (post.props) {
        if (post.props.username === currentUsername ||
            post.props.addedUsername === currentUsername ||
            post.props.removedUsername === currentUsername) {
            return false;
        }
    }

    return true;
}

export function isPostPendingOrFailed(post) {
    return post.failed || post.id === post.pending_post_id;
}

export function comparePosts(a, b) {
    const aIsPendingOrFailed = isPostPendingOrFailed(a);
    const bIsPendingOrFailed = isPostPendingOrFailed(b);
    if (aIsPendingOrFailed && !bIsPendingOrFailed) {
        return -1;
    } else if (!aIsPendingOrFailed && bIsPendingOrFailed) {
        return 1;
    }

    if (a.create_at > b.create_at) {
        return -1;
    } else if (a.create_at < b.create_at) {
        return 1;
    }

    return 0;
}

export function generateNextPosts(posts = {}, newPost = {}, recentPost = {}) {
    console.log('generateNextPosts')
    let nextPosts;

    // Only the new post is a user activity system post
    if (
        (!recentPost || !isPostUserActivity(recentPost)) &&
        isPostUserActivity(newPost)
    ) {
        const postToAppend = {...newPost, system_ids: [newPost.id]};
        nextPosts = {
            ...posts,
            [postToAppend.id]: postToAppend
        };

    // New and recent posts are user activity system posts
    } else if (
        recentPost &&
        isPostUserActivity(recentPost) &&
        isPostUserActivity(post) &&
        recentPost.system_ids
    ) {
        if (recentPost.system_ids.length < PostTypes.POST_PROPS_USER_ACTIVITIES_MAX) {
            let {combinedSystemPost, deletedSystemPost} = combineUserActivitySystemPost(newPost, recentPost);

            nextPosts = {
                ...posts,
                [combinedSystemPost.id]: combinedSystemPost,
                [deletedSystemPost.id]: deletedSystemPost
            };
        }

    // Regular posts or combined user activity post has reached maximum combined posts
    } else {
        console.log('3 generateNextPosts')
        nextPosts = {
            ...posts,
            [newPost.id]: newPost
        };
    }

    Object.keys(nextPosts).forEach((id) => {
        if (nextPosts[id].state === Posts.POST_DELETED) {
            Reflect.deleteProperty(nextPosts, id);
        }
    });

    return nextPosts;
}

// TODO: check if need to export
export function isPostUserActivity(post) {
    return post.type && post.type !== '' && Posts.USER_ACTIVITY_POST_TYPES.includes(post.type);
}

// TODO: check if need to export
export function combineUserActivitySystemPost(newSystemPost, recentSystemPost) {
    const newMessage = `${recentSystemPost.message} ${newSystemPost.message}`;
    const systemIds = [...recentSystemPost.system_ids, newSystemPost.id];

    let newUserActivities = recentSystemPost.props.user_activities;
    newUserActivities.push({...newSystemPost.props, type: newSystemPost.type});
    const newProps = {...recentSystemPost.props, user_activities: newUserActivities};

    const combinedSystemPost = {
        ...recentSystemPost,
        message: newMessage,
        system_ids: systemIds,
        props: newProps
    };

    const deletedSystemPost = {
        ...newSystemPost,
        state: Posts.POST_DELETED
    }

    return {combinedSystemPost, deletedSystemPost};
}

export function combineUserActivitySystemPosts(posts = {}, postsForChannel = []) {
    let nextPosts = {...posts};
    let combinedSystemPosts;
    let deletedSystemPosts = [];
    const {POST_PROPS_USER_ACTIVITIES, POST_PROPS_USER_ACTIVITIES_MAX} = Posts;

    function updateNextPosts(newPosts, combinedPost, deletedPosts) {
        newPosts = {
            ...newPosts,
            [combinedPost.id]: combinedPost
        }

        deletedPosts.forEach((deletedPost) => {
            newPosts = {
                ...newPosts,
                [deletedPost.id]: deletedPost
            }
        });

        return newPosts;
    }

    for (let i = postsForChannel.length - 1; i >= 0; i--) {
        const post = nextPosts[postsForChannel[i]];

        if (
            isPostUserActivity(post) &&
            post.state !== Posts.POST_DELETED
        ) {
            if (!combinedSystemPosts) {
                combinedSystemPosts = {
                    ...post,
                    system_ids: [post.id],
                    props: {...post.props, user_activities: [{...post.props, type: post.type}]}
                };
                nextPosts = {
                    ...nextPosts,
                    [combinedSystemPosts.id]: combinedSystemPosts
                }
                
            } else if (combinedSystemPosts) {
                if (combinedSystemPosts.system_ids.length < POST_PROPS_USER_ACTIVITIES_MAX) {
                    let {combinedSystemPost, deletedSystemPost} = combineUserActivitySystemPost(post, combinedSystemPosts);
                    combinedSystemPosts = combinedSystemPost;
                    deletedSystemPosts.push(deletedSystemPost)
                } else {
                    nextPosts = updateNextPosts(nextPosts, combinedSystemPosts, deletedSystemPosts);
                    combinedSystemPosts = null;
                    deletedSystemPosts = [];
                }
            }
        } else if (combinedSystemPosts) {
            nextPosts = {
                ...nextPosts,
                [combinedSystemPosts.id]: combinedSystemPosts
            }

            combinedSystemPosts = null;
        }
    }

    if (combinedSystemPosts) {
        nextPosts = updateNextPosts(nextPosts, combinedSystemPosts, deletedSystemPosts);
        combinedSystemPosts = null;
        deletedSystemPosts = [];
    }

    Object.keys(nextPosts).forEach((id) => {
        if (nextPosts[id].state === Posts.POST_DELETED) {
            Reflect.deleteProperty(nextPosts, id);
        }
    });

    const nextPostsInChannel = postsForChannel.filter((postId) => {
        return typeof nextPosts[postId] !== 'undefined';
    });

    return {nextPosts, nextPostsInChannel};
}
