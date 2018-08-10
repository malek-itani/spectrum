// @flow
import * as React from 'react';
import { connect } from 'react-redux';
import Clipboard from 'react-clipboard.js';
import { Manager, Reference, Popper } from 'react-popper';
import { CLIENT_URL } from 'src/api/constants';
import { addToastWithTimeout } from 'src/actions/toasts';
import { openModal } from 'src/actions/modals';
import Icon from 'src/components/icon';
import compose from 'recompose/compose';
import { Button, TextButton, IconButton } from 'src/components/button';
import Flyout from 'src/components/flyout';
import { LikeButton } from 'src/components/threadLikes';
import type { GetThreadType } from 'shared/graphql/queries/thread/getThread';
import toggleThreadNotificationsMutation from 'shared/graphql/mutations/thread/toggleThreadNotifications';
import OutsideClickHandler from 'src/components/outsideClickHandler';
import { track, events, transformations } from 'src/helpers/analytics';
import type { Dispatch } from 'redux';

import {
  ShareButtons,
  ShareButton,
  ActionBarContainer,
  FlyoutRow,
  DropWrap,
  EditDone,
  Label,
} from '../style';

type Props = {
  thread: GetThreadType,
  currentUser: Object,
  isEditing: boolean,
  dispatch: Dispatch<Object>,
  toggleThreadNotifications: Function,
  toggleEdit: Function,
  saveEdit: Function,
  togglePinThread: Function,
  pinThread: Function,
  triggerDelete: Function,
  threadLock: Function,
  isSavingEdit: boolean,
  title: string,
  isLockingThread: boolean,
  isPinningThread: boolean,
};
type State = {
  notificationStateLoading: boolean,
  flyoutOpen: boolean,
  isSettingsBtnHovering: boolean,
};
class ActionBar extends React.Component<Props, State> {
  state = {
    notificationStateLoading: false,
    flyoutOpen: false,
    isSettingsBtnHovering: false,
  };

  toggleHover = () => {
    this.setState(({ isSettingsBtnHovering }) => ({
      isSettingsBtnHovering: !isSettingsBtnHovering,
    }));
  };

  toggleFlyout = val => {
    if (val) {
      return this.setState({ flyoutOpen: val });
    }

    if (this.state.flyoutOpen === false) {
      return this.setState({ flyoutOpen: true });
    } else {
      return this.setState({ flyoutOpen: false });
    }
  };

  triggerChangeChannel = () => {
    const { thread, dispatch } = this.props;

    track(events.THREAD_MOVED_INITED, {
      thread: transformations.analyticsThread(thread),
      channel: transformations.analyticsChannel(thread.channel),
      community: transformations.analyticsCommunity(thread.community),
    });

    dispatch(openModal('CHANGE_CHANNEL', { thread }));
  };

  toggleNotification = () => {
    const { thread, dispatch, toggleThreadNotifications } = this.props;
    const threadId = thread.id;

    this.setState({
      notificationStateLoading: true,
    });

    toggleThreadNotifications({
      threadId,
    })
      .then(({ data: { toggleThreadNotifications } }) => {
        this.setState({
          notificationStateLoading: false,
        });

        if (toggleThreadNotifications.receiveNotifications) {
          return dispatch(
            addToastWithTimeout('success', 'Notifications activated!')
          );
        } else {
          return dispatch(
            addToastWithTimeout('neutral', 'Notifications turned off')
          );
        }
      })
      .catch(err => {
        this.setState({
          notificationStateLoading: true,
        });
        dispatch(addToastWithTimeout('error', err.message));
      });
  };

  getThreadActionPermissions = () => {
    const { currentUser, thread } = this.props;
    const {
      channel: { channelPermissions },
      community: { communityPermissions },
    } = thread;

    const isThreadAuthor =
      currentUser && currentUser.id === thread.author.user.id;
    const isChannelModerator = currentUser && channelPermissions.isModerator;
    const isCommunityModerator =
      currentUser && communityPermissions.isModerator;
    const isChannelOwner = currentUser && channelPermissions.isOwner;
    const isCommunityOwner = currentUser && communityPermissions.isOwner;

    return {
      isThreadAuthor,
      isChannelModerator,
      isCommunityModerator,
      isChannelOwner,
      isCommunityOwner,
    };
  };

  shouldRenderEditThreadAction = () => {
    const { isThreadAuthor } = this.getThreadActionPermissions();
    return isThreadAuthor;
  };

  shouldRenderMoveThreadAction = () => {
    const {
      isCommunityOwner,
      isCommunityModerator,
    } = this.getThreadActionPermissions();

    return isCommunityModerator || isCommunityOwner;
  };

  shouldRenderLockThreadAction = () => {
    const {
      isThreadAuthor,
      isChannelModerator,
      isChannelOwner,
      isCommunityOwner,
      isCommunityModerator,
    } = this.getThreadActionPermissions();

    return (
      isThreadAuthor ||
      isChannelModerator ||
      isCommunityModerator ||
      isChannelOwner ||
      isCommunityOwner
    );
  };

  shouldRenderDeleteThreadAction = () => {
    const {
      isThreadAuthor,
      isChannelModerator,
      isChannelOwner,
      isCommunityOwner,
      isCommunityModerator,
    } = this.getThreadActionPermissions();

    return (
      isThreadAuthor ||
      isChannelModerator ||
      isCommunityModerator ||
      isChannelOwner ||
      isCommunityOwner
    );
  };

  shouldRenderPinThreadAction = () => {
    const { thread } = this.props;
    const {
      isCommunityOwner,
      isCommunityModerator,
    } = this.getThreadActionPermissions();

    return (
      !thread.channel.isPrivate && (isCommunityOwner || isCommunityModerator)
    );
  };

  shouldRenderActionsDropdown = () => {
    const {
      isThreadAuthor,
      isChannelModerator,
      isChannelOwner,
      isCommunityOwner,
      isCommunityModerator,
    } = this.getThreadActionPermissions();

    return (
      isThreadAuthor ||
      isChannelModerator ||
      isCommunityModerator ||
      isChannelOwner ||
      isCommunityOwner
    );
  };

  render() {
    const {
      thread,
      currentUser,
      isEditing,
      isSavingEdit,
      title,
      isLockingThread,
      isPinningThread,
    } = this.props;
    const {
      notificationStateLoading,
      flyoutOpen,
      isSettingsBtnHovering,
    } = this.state;
    const isPinned = thread.community.pinnedThreadId === thread.id;

    const shouldRenderActionsDropdown = this.shouldRenderActionsDropdown();
    const shouldRenderPinThreadAction = this.shouldRenderPinThreadAction();
    const shouldRenderLockThreadAction = this.shouldRenderLockThreadAction();
    const shouldRenderMoveThreadAction = this.shouldRenderMoveThreadAction();
    const shouldRenderEditThreadAction = this.shouldRenderEditThreadAction();
    const shouldRenderDeleteThreadAction = this.shouldRenderDeleteThreadAction();

    if (isEditing) {
      return (
        <ActionBarContainer>
          <div style={{ display: 'flex' }} />
          <div style={{ display: 'flex' }}>
            <EditDone data-cy="cancel-thread-edit-button">
              <TextButton onClick={this.props.toggleEdit}>Cancel</TextButton>
            </EditDone>
            <EditDone>
              <Button
                loading={isSavingEdit}
                disabled={title.trim().length === 0 || isSavingEdit}
                onClick={this.props.saveEdit}
                data-cy="save-thread-edit-button"
              >
                Save
              </Button>
            </EditDone>
          </div>
        </ActionBarContainer>
      );
    } else {
      return (
        <ActionBarContainer>
          <div style={{ display: 'flex' }}>
            <LikeButton thread={thread} tipLocation={'bottom-right'} />

            {!thread.channel.isPrivate && (
              <ShareButtons>
                <ShareButton
                  facebook
                  tipText={'Share'}
                  tipLocation={'bottom-right'}
                  data-cy="thread-facebook-button"
                >
                  <a
                    href={`https://www.facebook.com/sharer/sharer.php?u=https://spectrum.chat/thread/${
                      thread.id
                    }&t=${thread.content.title}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon
                      glyph={'facebook'}
                      size={24}
                      onClick={() =>
                        track(events.THREAD_SHARED, { method: 'facebook' })
                      }
                    />
                  </a>
                </ShareButton>

                <ShareButton
                  twitter
                  tipText={'Tweet'}
                  tipLocation={'bottom-right'}
                  data-cy="thread-tweet-button"
                >
                  <a
                    href={`https://twitter.com/share?text=${
                      thread.content.title
                    } on @withspectrum&url=https://spectrum.chat/thread/${
                      thread.id
                    }`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <Icon
                      glyph={'twitter'}
                      size={24}
                      onClick={() =>
                        track(events.THREAD_SHARED, { method: 'twitter' })
                      }
                    />
                  </a>
                </ShareButton>

                <Clipboard
                  style={{ background: 'none' }}
                  data-clipboard-text={`${CLIENT_URL}/thread/${thread.id}`}
                  onSuccess={() =>
                    this.props.dispatch(
                      addToastWithTimeout('success', 'Copied to clipboard')
                    )
                  }
                >
                  <ShareButton
                    tipText={'Copy link'}
                    tipLocation={'bottom-right'}
                    data-cy="thread-copy-link-button"
                  >
                    <a>
                      <Icon
                        glyph={'link'}
                        size={24}
                        onClick={() =>
                          track(events.THREAD_SHARED, { method: 'link' })
                        }
                      />
                    </a>
                  </ShareButton>
                </Clipboard>
              </ShareButtons>
            )}
            {thread.channel.isPrivate && (
              <ShareButtons>
                <Clipboard
                  style={{ background: 'none' }}
                  data-clipboard-text={`https://spectrum.chat/thread/${
                    thread.id
                  }`}
                  onSuccess={() =>
                    this.props.dispatch(
                      addToastWithTimeout('success', 'Copied to clipboard')
                    )
                  }
                >
                  <ShareButton
                    tipText={'Copy link'}
                    tipLocation={'bottom-right'}
                    data-cy="thread-copy-link-button"
                  >
                    <a>
                      <Icon
                        glyph={'link'}
                        size={24}
                        onClick={() =>
                          track(events.THREAD_SHARED, { method: 'link' })
                        }
                      />
                    </a>
                  </ShareButton>
                </Clipboard>
              </ShareButtons>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center' }}>
            {currentUser ? (
              <Button
                loading={notificationStateLoading}
                onClick={this.toggleNotification}
                data-cy="thread-notifications-toggle"
              >
                <Icon
                  glyph={
                    thread.receiveNotifications
                      ? 'notification-fill'
                      : 'notification'
                  }
                  size={24}
                />
                {thread.receiveNotifications ? 'Subscribed' : 'Notify me'}
              </Button>
            ) : (
              <Button
                data-cy="thread-notifications-login-capture"
                onClick={() =>
                  this.props.dispatch(openModal('CHAT_INPUT_LOGIN_MODAL', {}))
                }
              >
                <Icon glyph="notification" size={24} />
                Notify me
              </Button>
            )}

            {shouldRenderActionsDropdown && (
              <DropWrap
                onMouseEnter={this.toggleHover}
                onMouseLeave={this.toggleHover}
                style={{ marginRight: '8px' }}
              >
                <Manager>
                  <Reference>
                    {({ ref }) => {
                      return (
                        <IconButton
                          onClick={this.toggleFlyout}
                          data-cy="thread-actions-dropdown-trigger"
                          innerRef={ref}
                        >
                          <Icon glyph="settings" />
                        </IconButton>
                      );
                    }}
                  </Reference>
                  {(isSettingsBtnHovering || flyoutOpen) && (
                    <OutsideClickHandler onOutsideClick={this.toggleFlyout}>
                      <Popper
                        placement="bottom-end"
                        modifiers={{
                          preventOverflow: { enabled: true },
                          flip: {
                            boundariesElement: 'scrollParent',
                            behavior: ['top', 'bottom', 'top'],
                          },
                          hide: { enable: false },
                        }}
                      >
                        {({ style, ref, placement }) => {
                          return (
                            <Flyout
                              data-cy="thread-actions-dropdown"
                              innerRef={ref}
                              style={style}
                            >
                              <FlyoutRow hideAbove={768}>
                                <TextButton
                                  onClick={this.toggleNotification}
                                  data-cy={'thread-dropdown-notifications'}
                                >
                                  {thread.receiveNotifications ? (
                                    <Icon glyph="notification-fill" />
                                  ) : (
                                    <Icon glyph="notification" />
                                  )}
                                  {thread.receiveNotifications
                                    ? 'Subscribed'
                                    : 'Notify me'}
                                </TextButton>
                              </FlyoutRow>

                              {shouldRenderEditThreadAction && (
                                <FlyoutRow>
                                  <TextButton
                                    onClick={this.props.toggleEdit}
                                    data-cy={'thread-dropdown-edit'}
                                  >
                                    <Icon glyph="edit" />
                                    Edit post
                                  </TextButton>
                                </FlyoutRow>
                              )}

                              {shouldRenderPinThreadAction && (
                                <FlyoutRow>
                                  <TextButton
                                    onClick={this.props.togglePinThread}
                                    data-cy={'thread-dropdown-pin'}
                                    loading={isPinningThread}
                                    disabled={isPinningThread}
                                  >
                                    {isPinned ? (
                                      <Icon glyph="pin-fill" />
                                    ) : (
                                      <Icon glyph="pin" />
                                    )}
                                    {isPinned ? 'Unpin thread' : 'Pin thread'}
                                  </TextButton>
                                </FlyoutRow>
                              )}

                              {shouldRenderMoveThreadAction && (
                                <FlyoutRow hideBelow={1024}>
                                  <TextButton
                                    onClick={this.triggerChangeChannel}
                                    data-cy={'thread-dropdown-move'}
                                  >
                                    <Icon glyph="channel" />
                                    Move thread
                                  </TextButton>
                                </FlyoutRow>
                              )}

                              {shouldRenderLockThreadAction && (
                                <FlyoutRow>
                                  <TextButton
                                    onClick={this.props.threadLock}
                                    data-cy={'thread-dropdown-lock'}
                                    loading={isLockingThread}
                                    disabled={isLockingThread}
                                  >
                                    {thread.isLocked ? (
                                      <Icon glyph="private" />
                                    ) : (
                                      <Icon glyph="private-unlocked" />
                                    )}
                                    {thread.isLocked
                                      ? 'Unlock chat'
                                      : 'Lock chat'}
                                  </TextButton>
                                </FlyoutRow>
                              )}

                              {shouldRenderDeleteThreadAction && (
                                <FlyoutRow>
                                  <TextButton
                                    onClick={this.props.triggerDelete}
                                    data-cy={'thread-dropdown-delete'}
                                  >
                                    <Icon glyph="delete" />
                                    <Label>Delete</Label>
                                  </TextButton>
                                </FlyoutRow>
                              )}
                            </Flyout>
                          );
                        }}
                      </Popper>
                    </OutsideClickHandler>
                  )}
                </Manager>
              </DropWrap>
            )}
          </div>
        </ActionBarContainer>
      );
    }
  }
}

export default compose(
  connect(),
  toggleThreadNotificationsMutation
)(ActionBar);
