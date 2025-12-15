'use client'

import { useState } from 'react'
import { Header } from '@/components/layout/Header'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { ClusterList } from '@/components/clusters/ClusterList'
import { ClusterForm } from '@/components/clusters/ClusterForm'
import { ClusterGroupAssigner } from '@/components/clusters/ClusterGroupAssigner'
import { useClusters } from '@/hooks/useClusters'
import type { Cluster, CreateClusterInput, UpdateClusterInput } from '@/lib/types'

export default function CategoriesPage() {
  const { clusters, isLoading, createCluster, updateCluster, deleteCluster, mutate } = useClusters()
  const [isFormOpen, setIsFormOpen] = useState(false)
  const [editingCluster, setEditingCluster] = useState<Cluster | null>(null)
  const [assigningCluster, setAssigningCluster] = useState<Cluster | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleCreate = () => {
    setEditingCluster(null)
    setIsFormOpen(true)
  }

  const handleEdit = (cluster: Cluster) => {
    setEditingCluster(cluster)
    setIsFormOpen(true)
  }

  const handleDelete = async (cluster: Cluster) => {
    try {
      await deleteCluster(cluster._id)
    } catch (error) {
      console.error('Failed to delete cluster:', error)
    }
  }

  const handleSubmit = async (data: CreateClusterInput | UpdateClusterInput) => {
    setIsSubmitting(true)
    try {
      if (editingCluster) {
        await updateCluster(editingCluster._id, data)
      } else {
        await createCluster(data as CreateClusterInput)
      }
      setIsFormOpen(false)
      setEditingCluster(null)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleCloseForm = () => {
    setIsFormOpen(false)
    setEditingCluster(null)
  }

  const handleAssignGroups = (cluster: Cluster) => {
    setAssigningCluster(cluster)
  }

  const handleCloseAssigner = () => {
    setAssigningCluster(null)
  }

  const handleSaveGroups = () => {
    mutate() // Refresh the clusters list
  }

  const totalGroups = clusters.reduce((sum, c) => sum + c.groupCount, 0)

  return (
    <div className="flex flex-col">
      <Header
        title="Categories"
        subtitle="Organize your WhatsApp groups into categories"
      />

      <div className="flex-1 space-y-6 p-6">
        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Categories</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">
                  {isLoading ? '-' : clusters.length}
                </p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full dark:bg-blue-900/30">
                <svg
                  className="w-6 h-6 text-blue-600 dark:text-blue-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                  />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Groups Categorized</p>
                <p className="text-2xl font-bold text-green-600 dark:text-green-400">
                  {isLoading ? '-' : totalGroups}
                </p>
              </div>
              <div className="p-3 bg-green-100 rounded-full dark:bg-green-900/30">
                <svg
                  className="w-6 h-6 text-green-600 dark:text-green-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                  />
                </svg>
              </div>
            </div>
          </Card>

          <Card>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Avg Groups/Category</p>
                <p className="text-2xl font-bold text-purple-600 dark:text-purple-400">
                  {isLoading || clusters.length === 0
                    ? '-'
                    : Math.round(totalGroups / clusters.length)}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full dark:bg-purple-900/30">
                <svg
                  className="w-6 h-6 text-purple-600 dark:text-purple-400"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"
                  />
                </svg>
              </div>
            </div>
          </Card>
        </div>

        {/* Categories List */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>All Categories</CardTitle>
              <button
                type="button"
                onClick={handleCreate}
                className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <svg
                  className="w-4 h-4 mr-2"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 4v16m8-8H4"
                  />
                </svg>
                Create Category
              </button>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {[...Array(4)].map((_, i) => (
                  <div
                    key={i}
                    className="h-32 animate-pulse rounded-lg bg-gray-200 dark:bg-gray-700"
                  />
                ))}
              </div>
            ) : (
              <ClusterList
                clusters={clusters}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onClick={handleAssignGroups}
                emptyMessage="No categories yet. Create one to start organizing your groups!"
              />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Create/Edit Form Modal */}
      <ClusterForm
        cluster={editingCluster}
        isOpen={isFormOpen}
        onClose={handleCloseForm}
        onSubmit={handleSubmit}
        isLoading={isSubmitting}
      />

      {/* Group Assigner Modal */}
      {assigningCluster && (
        <ClusterGroupAssigner
          cluster={assigningCluster}
          isOpen={!!assigningCluster}
          onClose={handleCloseAssigner}
          onSave={handleSaveGroups}
        />
      )}
    </div>
  )
}
